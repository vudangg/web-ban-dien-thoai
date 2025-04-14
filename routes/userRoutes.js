const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const isAuthenticated = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/auth');

// Route dành cho admin
router.get('/orders', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const orders = await Order.find(); // Lấy tất cả đơn hàng
    res.render('orders', { user: req.user, orders });
  } catch (error) {
    res.status(500).render('orders', {
      user: req.user,
      orders: [],
      errorMessage: 'Lỗi khi lấy danh sách đơn hàng',
    });
  }
});

// Route dành cho khách hàng
router.get('/customerOrders', isAuthenticated, async (req, res) => {
  console.log("User trong customer-orders:", req.user);
  try {
    const orders = await Order.find({ userId: req.user.id });
    res.render('customerOrders', { user: req.user, orders });
  } catch (error) {
    console.error("Lỗi khi lấy đơn hàng:", error);
    res.status(500).send('Lỗi khi lấy danh sách đơn hàng.');
  }
});
module.exports = router;
