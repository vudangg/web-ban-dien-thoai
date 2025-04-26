module.exports = function(requiredRole) {
  return function(req, res, next) {
    if (!req.session.user) {
      return res.redirect('/login');
    }

    if (req.session.user.role !== requiredRole) {
      return res.status(403).send('Bạn không có quyền truy cập trang này.');
    }

    next();
  };
};
