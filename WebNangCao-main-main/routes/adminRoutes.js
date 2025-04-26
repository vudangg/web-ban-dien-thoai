const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin'); 
const bcrypt = require('bcryptjs'); 
const User = require('../models/User');
const Order = require('../models/Order'); 
const { isAuthenticated, isAdmin } = require('../middleware/auth');
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
// Hiển thị danh sách tất cả đơn hàng
router.get('/orders', isAdmin, async (req, res) => {
  try {
      // Lấy tất cả đơn hàng, bao gồm thông tin sản phẩm
      const orders = await Order.find().populate('items.productId').sort({ createdAt: -1 }); // Sắp xếp theo ngày tạo
      const token = req.cookies.token; // Retrieve token from cookies
      res.render('orders', { orders, user: req.user, token }); // Pass token to the view
  } catch (error) {
      console.error("Lỗi khi lấy đơn hàng:", error);
      res.render('orders', { orders: [], errorMessage: 'Đã có lỗi xảy ra. Vui lòng thử lại.' });
  }
});
router.get('/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find(); // Fetch orders from the database
    res.render('orders', { orders, errorMessage: null });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.render('orders', { orders: [], errorMessage: 'Lỗi khi tải danh sách đơn hàng.' });
  }
});
// Cập nhật trạng thái đơn hàng
router.post('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).send('Trạng thái không hợp lệ');
    }

    await Order.findByIdAndUpdate(id, { status });
    res.redirect('/admin/orders');
  } catch (err) {
    console.error('❌ Lỗi cập nhật trạng thái đơn hàng:', err);
    res.status(500).send('Lỗi server khi cập nhật trạng thái đơn hàng');
  }
});
// Route dành cho admin quản lý đơn hàng
router.get('/manage-orders', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Logic lấy danh sách đơn hàng
    res.json({ message: 'Danh sách đơn hàng cho admin' });
  } catch (error) {
    res.status(500).send('Lỗi khi xử lý đơn hàng');
  }
});

// Route dành cho admin quản lý người dùng
router.get('/manage-users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Logic lấy danh sách người dùng
    res.json({ message: 'Danh sách người dùng cho admin' });
  } catch (error) {
    res.status(500).send('Lỗi khi xử lý người dùng');
  }
});
module.exports = router;
