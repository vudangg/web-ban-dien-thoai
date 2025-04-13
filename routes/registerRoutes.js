const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Hiển thị form đăng ký
router.get('/', (req, res) => {
    res.render('register', { successMessage: null }); // ✅ truyền biến mặc định
});

// Xử lý form đăng ký
router.post('/', async (req, res) => {
    let { name, username, email, password, role } = req.body;

    name = name.trim();
    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.send("Email đã tồn tại. <a href='/register'>Thử lại</a>");
    }

    // Nếu không có role gửi từ form, gán mặc định là 'user'
    if (!role) role = 'user';

    const newUser = new User({
        name,
        username,
        email,
        password,
        role
    });

    try {
        await newUser.save();
        res.render('register', { successMessage: 'Đăng ký thành công! Bạn có thể đăng nhập ngay.' });
    } catch (error) {
        console.error("Lỗi khi đăng ký:", error);
        res.send("Đã có lỗi xảy ra. Vui lòng thử lại.");
    }
});

module.exports = router;
