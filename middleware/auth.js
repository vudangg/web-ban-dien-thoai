const jwt = require('jsonwebtoken');

// Middleware xác thực người dùng
const isAuthenticated = (req, res, next) => {
  const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');

  console.log("🔍 Token từ cookie:", req.cookies?.token);
  console.log("🔍 Token từ header Authorization:", req.header('Authorization'));

  if (!token) {
    console.log("🚫 Không có token. Chuyển về login.");
    return res.status(401).redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    req.user = decoded.user;
    res.locals.user = req.user;
    next();
  } catch (error) {
    console.error('❌ Token không hợp lệ:', error.message);
    return res.status(401).redirect('/login');
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).send('🚫 Bạn không có quyền truy cập.');
};


// Middleware kiểm tra quyền moderator (nếu có)
const isModerator = (req, res, next) => {
  if (req.user && (req.user.role === 'moderator' || req.user.role === 'admin')) {
    return next();
  }
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    return res.status(403).json({ message: 'Bạn không có quyền truy cập.' });
  }
  return res.status(403).send('🚫 Bạn không có quyền truy cập.');
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isModerator
};
