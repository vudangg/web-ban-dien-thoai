const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin'); // model Admin
const bcrypt = require('bcrypt'); // hoặc bcryptjs nếu bạn dùng thư viện đó

// Hiển thị form đăng ký
router.get('/register', (req, res) => {
    res.render('adminRegister', { title: 'Đăng ký Admin' });
});

// Xử lý đăng ký admin
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            return res.send('Tên người dùng đã tồn tại.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new Admin({ username, password: hashedPassword });
        await newAdmin.save();
        res.send('Đăng ký thành công!');
    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi server.');
    }
});

module.exports = router;
