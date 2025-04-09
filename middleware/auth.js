function isAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        return next(); // Cho phép tiếp tục
    }
    return res.status(403).send('🚫 Bạn không có quyền thực hiện chức năng này.');
}

module.exports = { isAdmin };
