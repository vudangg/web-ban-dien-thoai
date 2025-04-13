const express = require('express');
const router = express.Router();
const path = require('path');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Hiển thị giỏ hàng
router.get('/cart', (req, res) => {
  const cart = req.session.cart || [];
  res.render('cart', { title: 'Giỏ hàng', cart });
});

// Thêm sản phẩm vào giỏ hàng
router.post('/cart/add', async (req, res) => {
  try {
    const { productId } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).send('Không tìm thấy sản phẩm');

    if (!req.session.cart) req.session.cart = [];

    const existing = req.session.cart.find(p => p.productId === productId);
    if (existing) {
      existing.quantity++;
    } else {
      req.session.cart.push({
        productId,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1
      });
    }

    res.redirect('/cart');
  } catch (err) {
    console.error('Lỗi khi thêm vào giỏ hàng:', err);
    res.status(500).send('Lỗi server khi thêm vào giỏ hàng');
  }
});

// Xoá sản phẩm khỏi giỏ hàng
router.post('/cart/remove', (req, res) => {
  const { productId } = req.body;
  if (!req.session.cart) req.session.cart = [];
  req.session.cart = req.session.cart.filter(item => item.productId !== productId);
  res.redirect('/cart');
});

// Trang chọn phương thức thanh toán
router.get('/checkout', (req, res) => {
  const cart = req.session.cart || [];
  res.render('checkout', { title: 'Thanh toán', cart });
});

// Xử lý chọn phương thức thanh toán (bước 2)
router.post('/checkout', (req, res) => {
  const { paymentMethod } = req.body;
  let message = '';
  let qrImage = '';

  switch (paymentMethod) {
    case 'momo':
      message = 'Bạn đã chọn thanh toán qua MoMo. Quét mã QR dưới đây để hoàn tất thanh toán.';
      qrImage = '/uploads/momo_qr.png';
      break;
    case 'bank':
      message = 'Bạn đã chọn thanh toán qua Internet Banking. Quét mã QR dưới đây để chuyển khoản.';
      qrImage = '/uploads/bank_qr.png';
      break;
    case 'cod':
      message = 'Bạn đã chọn thanh toán khi nhận hàng (COD).';
      break;
    default:
      message = 'Phương thức thanh toán không hợp lệ.';
  }

  req.session.paymentInfo = { paymentMethod, message, qrImage };
  res.render('confirmCheckout', {
    title: 'Xác nhận thanh toán',
    paymentInfo: req.session.paymentInfo
  });
});
// Xử lý hoàn tất thanh toán (bước 3)
router.post('/complete-checkout', async (req, res) => {
  console.log('✅ [complete-checkout] SESSION:', req.session);

  const cart = req.session.cart || [];
  const user = req.session.user;

  if (!user || !user.id) {
    console.warn('❌ Không có session user');
    return res.redirect('/login');
  }


  if (cart.length === 0) {
    return res.redirect('/cart');
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  try {
    const order = new Order({
      userId: user.id, // ✅ đúng, vì bạn lưu là `id` trong session
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      })),
      total,
      status: 'pending'
    });

    await order.save();

    req.session.cart = [];
    req.session.paymentInfo = null;

    res.render('checkoutSuccess', {
      title: 'Thanh toán thành công',
      finalMessage: 'Thanh toán thành công! Cảm ơn bạn đã mua hàng.'
    });
  } catch (err) {
    console.error('❌ Lỗi khi lưu đơn hàng:', err);
    res.status(500).send('Đã xảy ra lỗi khi hoàn tất thanh toán. Vui lòng thử lại.');
  }
});
module.exports = router;
