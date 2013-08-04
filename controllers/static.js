// static page

exports.index = function(req, res, next) {
  res.render('static/index', {
    static: true  
  });
};

// About
exports.about = function (req, res, next) {
  res.render('static/about', {
    static: true  
  });
};

exports.etiquette = function(req, res, next) {
  res.render('static/etiquette', {
    static: true  
  });
};

// FAQ
exports.faq = function (req, res, next) {
  res.render('static/faq', {
    static: true  
  });
};

exports.gallery = function (req, res, next) {
  res.render('static/gallery', {
    static: true  
  });
};

exports.resources = function (req, res, next) {
  res.render('static/resources', {
    static: true  
  });
};

exports.calendar = function (req, res, next) {
  res.render('static/calendar', {
    static: true  
  });
};
