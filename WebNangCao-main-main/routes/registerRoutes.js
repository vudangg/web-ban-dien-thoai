const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Hiển thị form đăng ký
router.get('/', (req, res) => {
    res.render('register', { successMessage: null, errorMessage: null }); // ✅ Truyền biến thông báo lỗi
});

// Xử lý form đăng ký
router.post('/', async (req, res) => {
    let { name, username, email, password, role } = req.body;

    // Loại bỏ khoảng trắng ở đầu và cuối của các trường
    name = name.trim();
    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();

    // Kiểm tra nếu email bị trống
    if (!email) {
        return res.render('register', { errorMessage: 'Email không được để trống.', successMessage: null });
    }

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.render('register', { errorMessage: 'Email đã tồn tại. Vui lòng chọn email khác.', successMessage: null });
    }

    // Kiểm tra nếu mật khẩu không hợp lệ
    if (!password || password.length < 6) {
        return res.render('register', { errorMessage: 'Mật khẩu phải có ít nhất 6 ký tự.', successMessage: null });
    }

    // Nếu không có role gửi từ form, gán mặc định là 'user'
    if (!role) role = 'user';

    // Mã hóa mật khẩu trước khi lưu vào cơ sở dữ liệu
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        name,
        username,
        email,
        password: hashedPassword,
        role
    });

    try {
        await newUser.save();
        res.render('register', { successMessage: 'Đăng ký thành công! Bạn có thể đăng nhập ngay.', errorMessage: null });
    } catch (error) {
        console.error("Lỗi khi đăng ký:", error);
        res.render('register', { errorMessage: 'Đã có lỗi xảy ra. Vui lòng thử lại.', successMessage: null });
    }
});

module.exports = router;
