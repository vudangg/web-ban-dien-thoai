// routes/order.js
const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');  // Xác thực và phân quyền
const Order = require('../models/Order');  // Giả sử bạn có model Order để quản lý đơn hàng

// Route lấy danh sách đơn hàng của người dùng
router.get('/user-orders', isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách đơn hàng', error });
  }
});


// Route dành cho admin quản lý tất cả đơn hàng
router.get('/manage-orders', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const orders = await Order.find();  // Lấy tất cả đơn hàng nếu là admin
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xử lý đơn hàng', error });
  }
});
module.exports = router;
