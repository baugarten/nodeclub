// static page

exports.index = function(req, res, next) {
  res.render('static/index');
};

// About
exports.about = function (req, res, next) {
  res.render('static/about');
};

exports.etiquette = function(req, res, next) {
  res.render('static/etiquette');
};

// FAQ
exports.faq = function (req, res, next) {
  res.render('static/faq');
};
