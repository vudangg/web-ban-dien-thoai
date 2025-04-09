// middleware/roleMiddleware.js
module.exports = function(requiredRoles) {
    return function(req, res, next) {
      if (!req.session.user) {
        return res.redirect('/login');
      }
  
      const userRole = req.session.user.role;
  
      // Đảm bảo requiredRoles là mảng
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
      if (!roles.includes(userRole)) {
        return res.status(403).send('Bạn không có quyền truy cập trang này.');
      }
  
      next();
    };
  };
  