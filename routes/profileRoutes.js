const express = require('express');
const router = express.Router();
const User = require('../models/User');           // Import model User
const Customer = require('../models/Profile');    // Import model Profile (đặt tên là `Customer` trong code của bạn)

// Route lấy thông tin profile của khách hàng
router.get('/profile', (req, res) => {
    const userId = req.user._id;  // Giả sử bạn sử dụng middleware xác thực (JWT hoặc session)

    // Lấy thông tin profile từ model Customer, liên kết với User thông qua userId
    Customer.findOne({ userId })
        .then(profile => {
            if (!profile) {
                return res.status(404).json({ message: 'Không tìm thấy thông tin profile.' });
            }
            res.json(profile);
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ message: 'Lỗi hệ thống khi lấy thông tin.' });
        });
});

// Route cập nhật thông tin profile
router.put('/profile', (req, res) => {
    const userId = req.user._id;  // Giả sử bạn sử dụng middleware xác thực

    const { name, phone, address } = req.body;
    
    // Cập nhật thông tin profile người dùng
    Customer.findOneAndUpdate({ userId }, { name, phone, address, updatedAt: Date.now() }, { new: true })
        .then(updatedProfile => {
            if (!updatedProfile) {
                return res.status(404).json({ message: 'Không tìm thấy profile để cập nhật.' });
            }
            res.json(updatedProfile);
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ message: 'Lỗi hệ thống khi cập nhật thông tin.' });
        });
});

module.exports = router;
