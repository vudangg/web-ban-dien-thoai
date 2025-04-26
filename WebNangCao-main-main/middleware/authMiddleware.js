
module.exports = (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    // Gán thông tin user từ session cho req.user để sử dụng cho các truy vấn sau này
    req.user = req.session.user;
    res.locals.user = req.session.user;
    next();
  };
  