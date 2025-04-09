module.exports = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login'); // Nếu chưa đăng nhập, chuyển hướng về trang login
    }
    next(); // Tiến hành tiếp tục xử lý nếu đã đăng nhập
};
