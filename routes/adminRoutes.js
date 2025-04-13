const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin'); 
const bcrypt = require('bcryptjs'); 
const User = require('../models/User');
const Order = require('../models/Order'); 
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
// Route: Quản lý tài khoản người dùng
router.get('/users', async (req, res) => {
    try {
      const users = await User.find();
      res.render('users', { users }); 
    } catch (error) {
      console.error('Lỗi khi lấy danh sách người dùng:', error);
      res.status(500).send('Lỗi server');
    }
  });
// Quản lý đơn hàng

router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.render('orders', { orders });
  } catch (err) {
    console.error('LỖI TRONG /admin/orders:', err);
    // Gửi luôn message lỗi ra client để bạn biết chi tiết
    res.status(500).send(`Lỗi server: ${err.message}`);
  }
});


module.exports = router;
