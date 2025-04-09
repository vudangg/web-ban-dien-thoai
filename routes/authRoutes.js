const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");

router.get('/login', (req, res) => {
    res.render('login'); // Hiển thị trang đăng nhập
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Chuẩn hóa dữ liệu
    username = username.trim().toLowerCase();

    // Tìm người dùng theo username
    const user = await User.findOne({ username });
    if (!user) {
        return res.send("Tài khoản không tồn tại. <a href='/login'>Thử lại</a>");
    }

    // So sánh mật khẩu với mật khẩu đã mã hóa
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.send("Sai mật khẩu. <a href='/login'>Thử lại</a>");
    }

    // Lưu session đăng nhập
    req.session.user = { username: user.username, name: user.name };
    res.redirect('/');
});


router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login'); // Đăng xuất và quay về trang đăng nhập
    });
});
// 📌 Đăng ký tài khoản
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Kiểm tra xem user đã tồn tại chưa
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send("Email đã tồn tại! <a href='/register'>Thử lại</a>");
        }

        // Tạo user mới
        const newUser = new User({ username, email, password });
        await newUser.save();
        res.send("Đăng ký thành công! <a href='/login'>Đăng nhập</a>");
    } catch (error) {
        console.error("Lỗi đăng ký:", error);
        res.status(500).send("Lỗi server");
    }
});

// 📌 Quên mật khẩu - Gửi email đặt lại
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.send("Không tìm thấy email!");

        // Tạo token reset
        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetToken = resetToken;
        user.resetTokenExpire = Date.now() + 15 * 60 * 1000; // Hết hạn sau 15 phút
        await user.save();

        // Gửi email chứa link đặt lại mật khẩu
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: "your-email@gmail.com", pass: "your-password" },
        });

        const mailOptions = {
            from: "your-email@gmail.com",
            to: user.email,
            subject: "Đặt lại mật khẩu",
            html: `<p>Bạn đã yêu cầu đặt lại mật khẩu. Click vào link sau:</p>
                   <a href="http://localhost:3000/reset-password/${resetToken}">Đặt lại mật khẩu</a>`,
        };

        await transporter.sendMail(mailOptions);
        res.send("Email đặt lại mật khẩu đã được gửi!");
    } catch (error) {
        console.error("Lỗi quên mật khẩu:", error);
        res.status(500).send("Lỗi server");
    }
});

// 📌 Đặt lại mật khẩu
router.post("/reset-password/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        const user = await User.findOne({
            resetToken: token,
            resetTokenExpire: { $gt: Date.now() },
        });

        if (!user) return res.send("Token không hợp lệ hoặc đã hết hạn!");

        // Cập nhật mật khẩu mới
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetToken = null;
        user.resetTokenExpire = null;
        await user.save();

        res.send("Mật khẩu đã cập nhật! <a href='/login'>Đăng nhập</a>");
    } catch (error) {
        console.error("Lỗi đặt lại mật khẩu:", error);
        res.status(500).send("Lỗi server");
    }
});


module.exports = router;
