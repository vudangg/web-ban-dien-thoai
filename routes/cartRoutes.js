const express = require('express');
const router = express.Router();
const path = require('path');
const Product = require('../models/Product');
// Hiển thị giỏ hàng
router.get('/cart', (req, res) => {
    const cart = req.session.cart || [];
    console.log("Cart Data:", cart); 
    res.render('cart', { title: 'Giỏ hàng', cart });
});

// Xử lý thêm sản phẩm vào giỏ hàng
router.post('/cart/add', async (req, res) => {
    try {
      const { productId } = req.body;
  
      // ✅ Lấy sản phẩm từ database
      const product = await Product.findById(productId);
      if (!product) return res.status(404).send('Không tìm thấy sản phẩm');
  
      if (!req.session.cart) req.session.cart = [];
  
      const exist = req.session.cart.find(p => p.productId === productId);
      if (exist) {
        exist.quantity++;
      } else {
        req.session.cart.push({
          productId,
          name: product.name,
          price: product.price,
          image: product.image, // ✅ lấy ảnh từ sản phẩm
          quantity: 1
        });
      }
  
      res.redirect('/cart');
    } catch (err) {
      console.error('Lỗi khi thêm vào giỏ hàng:', err);
      res.status(500).send('Lỗi server khi thêm vào giỏ hàng');
    }
  });
  

// Hiển thị trang thanh toán (bước 1: chọn phương thức và hiển thị mã QR)
router.get('/checkout', (req, res) => {
    const cart = req.session.cart || [];
    console.log("Cart data:", cart);
    res.render('checkout', { title: 'Thanh toán', cart });
});

// Xử lý thông tin thanh toán và chuyển sang trang xác nhận (bước 2)
router.post('/checkout', (req, res) => {
    const { paymentMethod } = req.body;
    let message = "";
    let qrImage = "";

    // Xử lý các phương thức thanh toán
    switch (paymentMethod) {
        case "momo":
            message = "Bạn đã chọn thanh toán qua MoMo. Quét mã QR dưới đây để hoàn tất thanh toán.";
            qrImage = "/uploads/momo_qr.png"; // Đảm bảo file này tồn tại trong public/images
            break;
        case "bank":
            message = "Bạn đã chọn thanh toán qua Internet Banking. Quét mã QR dưới đây để chuyển khoản.";
            qrImage = "/uploads/bank_qr.png"; // Đảm bảo file này tồn tại trong public/images
            break;
        case "cod":
            message = "Bạn đã chọn thanh toán khi nhận hàng (COD).";
            break;
        default:
            message = "Phương thức thanh toán không hợp lệ.";
    }

    // Lưu thông tin thanh toán tạm thời vào session (hoặc truyền trực tiếp qua locals)
    req.session.paymentInfo = { paymentMethod, message, qrImage };

    // Render trang xác nhận thanh toán (bước 2) với thông tin đã nhận
    res.render('confirmCheckout', { title: 'Xác nhận thanh toán', paymentInfo: req.session.paymentInfo });
});

// Xử lý hoàn tất thanh toán (bước 3) và hiển thị trang thành công
router.post('/complete-checkout', (req, res) => {
    req.session.cart = []; // Xóa giỏ hàng sau khi thanh toán
    req.session.paymentInfo = null; // Xóa thông tin thanh toán

    res.render('checkoutSuccess', { title: 'Thanh toán thành công', finalMessage: 'Thanh toán thành công! Cảm ơn bạn đã mua hàng.' });
});

// Xử lý xóa sản phẩm khỏi giỏ hàng
router.post('/cart/remove', (req, res) => {
    const { productId } = req.body;

    if (!req.session.cart) {
        req.session.cart = [];
    }

    // Lọc bỏ sản phẩm có productId khỏi giỏ hàng
    req.session.cart = req.session.cart.filter(item => item.productId !== productId);

    res.redirect('/cart');
});

module.exports = router;
