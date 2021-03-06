var check = require('validator').check,
  sanitize = require('validator').sanitize;

var crypto = require('crypto');
var config = require('../config').config;

var User = require('../proxy').User;
var Message = require('../proxy').Message;
var mail = require('../services/mail');

//sign up
exports.showSignup = function (req, res) {
  res.render('sign/signup');
};

exports.signup = function (req, res, next) {
  var name = sanitize(req.body.name).trim();
  name = sanitize(name).xss();
  var loginname = name.toLowerCase();
  var pass = sanitize(req.body.pass).trim();
  pass = sanitize(pass).xss();
  var email = sanitize(req.body.email).trim();
  email = email.toLowerCase();
  email = sanitize(email).xss();
  var re_pass = sanitize(req.body.re_pass).trim();
  re_pass = sanitize(re_pass).xss();

  if (name === '' || pass === '' || re_pass === '' || email === '') {
    res.render('sign/signup', {error: 'Information is incomplete.', name: name, email: email});
    return;
  }

  if (name.length < 5) {
    res.render('sign/signup', {error: 'Username must be at least 5 characters.', name: name, email: email});
    return;
  }

  try {
    check(name, 'Username can only include 0-9，a-z，A-Z.').isAlphanumeric();
  } catch (e) {
    res.render('sign/signup', {error: e.message, name: name, email: email});
    return;
  }

  if (pass !== re_pass) {
    res.render('sign/signup', {error: 'Passwords do not match.', name: name, email: email});
    return;
  }

  try {
    check(email, 'Please enter a valid email.').isEmail();
  } catch (e) {
    res.render('sign/signup', {error: e.message, name: name, email: email});
    return;
  }

  User.getUsersByQuery({'$or': [{'loginname': loginname}, {'email': email}]}, {}, function (err, users) {
    if (err) {
      return next(err);
    }
    if (users.length > 0) {
      res.render('sign/signup', {error: 'Username or email has already been used.', name: name, email: email});
      return;
    }

    // md5 the pass
    pass = md5(pass);
    // create gavatar
    var avatar_url = '../public/images/yoga/December-2007.png' + md5(email.toLowerCase()) + '?size=48';

    User.newAndSave(name, loginname, pass, email, avatar_url, false, function (err) {
      if (err) {
        return next(err);
      }
      // 发送激活邮件
      mail.sendActiveMail(email, md5(email + config.session_secret), name, email);
      res.render('sign/signup', {
        success: 'Welcome to ' + config.name + '. Registration successful. Please check your email to activate your account.'
      });
    });
  });
};

/**
 * Show user login page.
 *
 * @param  {HttpRequest} req
 * @param  {HttpResponse} res
 */
exports.showLogin = function (req, res) {
  req.session._loginReferer = req.headers.referer;
  res.render('sign/signin');
};

/**
 * define some page when login just jump to the home page
 * @type {Array}
 */
var notJump = [
  '/active_account', //active page
  '/reset_pass',     //reset password page, avoid to reset twice
  '/signup',         //regist page
  '/signin',         //regist page
  '/search_pass'    //serch pass page
];

/**
 * Handle user login.
 *
 * @param {HttpRequest} req
 * @param {HttpResponse} res
 * @param {Function} next
 */
exports.login = function (req, res, next) {
  var loginname = sanitize(req.body.name).trim().toLowerCase();
  var pass = sanitize(req.body.pass).trim();

  if (!loginname || !pass) {
    return res.render('sign/signin', { error: 'Information is incomplete.' });
  }

  User.getUserByLoginName(loginname, function (err, user) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.render('sign/signin', { error: 'User does not exist.' });
    }
    pass = md5(pass);
    if (pass !== user.pass) {
      return res.render('sign/signin', { error: 'Incorrect password.' });
    }
    if (!user.active) {
      // 从新发送激活邮件
      mail.sendActiveMail(user.email, md5(user.email + config.session_secret), user.name, user.email);
      return res.render('sign/signin', { error: "You haven't activated your account yet. We sent an email to " + user.email });
    }
    // store session cookie
    gen_session(user, res);
    //check at some page just jump to home page
    var refer = req.session._loginReferer || '/';
    for (var i = 0, len = notJump.length; i !== len; ++i) {
      if (refer.indexOf(notJump[i]) >= 0) {
        refer = '/';
        break;
      }
    }
    console.log("Redirecting", refer);
    res.redirect(refer);
  });
};

// sign out
exports.signout = function (req, res, next) {
  req.session.destroy();
  res.clearCookie(config.auth_cookie_name, { path: '/' });
  res.redirect(req.headers.referer || 'home');
};

exports.active_account = function (req, res, next) {
  var key = req.query.key;
  var name = req.query.name;

  User.getUserByName(name, function (err, user) {
    if (err) {
      return next(err);
    }
    if (!user || md5(user.email + config.session_secret) !== key) {
      return res.render('notify/notify', {error: 'Hmm... something went wrong. Please try again.'});
    }
    if (user.active) {
      return res.render('notify/notify', {error: 'This account is already active'});
    }
    user.active = true;
    user.save(function (err) {
      if (err) {
        return next(err);
      }
      res.render('notify/notify', {success: 'Account activated! Please login.'});
    });
  });
};

exports.showSearchPass = function (req, res) {
  res.render('sign/search_pass');
};

exports.updateSearchPass = function (req, res, next) {
  var email = req.body.email;
  email = email.toLowerCase();

  try {
    check(email, '不正确的电子邮箱。').isEmail();
  } catch (e) {
    res.render('sign/search_pass', {error: e.message, email: email});
    return;
  }

  // 动态生成retrive_key和timestamp到users collection,之后重置密码进行验证
  var retrieveKey = randomString(15);
  var retrieveTime = new Date().getTime();
  User.getUserByMail(email, function (err, user) {
    if (!user) {
      res.render('sign/search_pass', {error: 'That email address is not registered.', email: email});
      return;
    }
    user.retrieve_key = retrieveKey;
    user.retrieve_time = retrieveTime;
    user.save(function (err) {
      if (err) {
        return next(err);
      }
      // 发送重置密码邮件
      mail.sendResetPassMail(email, retrieveKey, user.name);
      res.render('notify/notify', {success: 'Email sent. Please click the link inside to reset your password. '});
    });
  });
};

/**
 * reset password
 * 'get' to show the page, 'post' to reset password
 * after reset password, retrieve_key&time will be destroy
 * @param  {http.req}   req
 * @param  {http.res}   res
 * @param  {Function} next
 */
exports.reset_pass = function (req, res, next) {
  var key = req.query.key;
  var name = req.query.name;
  User.getUserByQuery(name, key, function (err, user) {
    if (!user) {
      return res.render('notify/notify', {error: 'Could not find that user.'});
    }
    var now = new Date().getTime();
    var oneDay = 1000 * 60 * 60 * 24;
    if (!user.retrieve_time || now - user.retrieve_time > oneDay) {
      return res.render('notify/notify', {error : 'This link has expired, please re-apply.'});
    }
    return res.render('sign/reset', {name : name, key : key});
  });
};

exports.update_pass = function (req, res, next) {
  var psw = req.body.psw || '';
  var repsw = req.body.repsw || '';
  var key = req.body.key || '';
  var name = req.body.name || '';
  if (psw !== repsw) {
    return res.render('sign/reset', {name : name, key : key, error : 'Passwords do not match.'});
  }
  User.getUserByQuery(name, key, function (err, user) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.render('notify/notify', {error : 'This is not a valid activation link.'});
    }
    user.pass = md5(psw);
    user.retrieve_key = null;
    user.retrieve_time = null;
    user.active = true; // 用户激活
    user.save(function (err) {
      if (err) {
        return next(err);
      }
      return res.render('notify/notify', {success: 'Your password has been reset.'});
    });
  });
};

function getAvatarURL(user) {
  if (user.avatar_url) {
    return user.avatar_url;
  }
  var avatar_url = user.profile_image_url || user.avatar;
  if (!avatar_url) {
    avatar_url = config.site_static_host + '/public/images/user_icon&48.png';
  }
  return avatar_url;
}

// auth_user middleware
exports.auth_user = function (req, res, next) {
  if (req.session.user) {
    if (config.admins[req.session.user.name]) {
      req.session.user.is_admin = true;
    }
    Message.getMessagesCount(req.session.user._id, function (err, count) {
      if (err) {
        return next(err);
      }
      req.session.user.messages_count = count;
      if (!req.session.user.avatar_url) {
        req.session.user.avatar_url = getAvatarURL(req.session.user);
      }
      res.local('current_user', req.session.user);
      return next();
    });
  } else {
    var cookie = req.cookies[config.auth_cookie_name];
    if (!cookie) {
      return next();
    }

    var auth_token = decrypt(cookie, config.session_secret);
    var auth = auth_token.split('\t');
    var user_id = auth[0];
    User.getUserById(user_id, function (err, user) {
      if (err) {
        return next(err);
      }
      if (user) {
        if (config.admins[user.name]) {
          user.is_admin = true;
        }
        Message.getMessagesCount(user._id, function (err, count) {
          if (err) {
            return next(err);
          }
          user.messages_count = count;
          req.session.user = user;
          req.session.user.avatar_url = user.avatar_url;
          res.local('current_user', req.session.user);
          return next();
        });
      } else {
        return next();
      }
    });
  }
};

// private
function gen_session(user, res) {
  var auth_token = encrypt(user._id + '\t' + user.name + '\t' + user.pass + '\t' + user.email, config.session_secret);
  res.cookie(config.auth_cookie_name, auth_token, {path: '/', maxAge: 1000 * 60 * 60 * 24 * 30}); //cookie 有效期30天
}

function encrypt(str, secret) {
  var cipher = crypto.createCipher('aes192', secret);
  var enc = cipher.update(str, 'utf8', 'hex');
  enc += cipher.final('hex');
  return enc;
}

function decrypt(str, secret) {
  var decipher = crypto.createDecipher('aes192', secret);
  var dec = decipher.update(str, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

function md5(str) {
  var md5sum = crypto.createHash('md5');
  md5sum.update(str);
  str = md5sum.digest('hex');
  return str;
}

function randomString(size) {
  size = size || 6;
  var code_string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var max_num = code_string.length + 1;
  var new_pass = '';
  while (size > 0) {
    new_pass += code_string.charAt(Math.floor(Math.random() * max_num));
    size--;
  }
  return new_pass;
}
