const express = require('express');
const router = express.Router();
const path = require('path');

// Hiển thị giỏ hàng
router.get('/cart', (req, res) => {
    const cart = req.session.cart || [];
    console.log("Cart Data:", cart); 
    res.render('cart', { title: 'Giỏ hàng', cart });
});

// Xử lý thêm sản phẩm vào giỏ hàng
router.post('/cart/add', (req, res) => {
    const { productId, name, price, image } = req.body;

    // Kiểm tra xem giá có hợp lệ không
    if (!price) {
        return res.status(400).send('Giá sản phẩm không tồn tại hoặc không hợp lệ');
    }

    console.log("Price received:", price);

    // Đảm bảo rằng price là chuỗi trước khi xử lý
    const priceStr = price.toString();
    // Loại bỏ các dấu chấm phân cách (nếu có) trước khi chuyển đổi
    const sanitizedPrice = priceStr.replace(/\./g, '');
    const parsedPrice = parseFloat(sanitizedPrice);

    if (isNaN(parsedPrice)) {
        return res.status(400).send('Giá sản phẩm không hợp lệ');
    }

    // Nếu giỏ hàng chưa được khởi tạo, khởi tạo giỏ hàng
    if (!req.session.cart) {
        req.session.cart = [];
    }

    // Kiểm tra nếu sản phẩm đã tồn tại trong giỏ hàng
    let cartItem = req.session.cart.find(item => item.productId == productId);
    if (cartItem) {
        // Nếu sản phẩm đã có, tăng số lượng lên 1
        cartItem.quantity += 1;
    } else {
        // Nếu chưa có, thêm mới sản phẩm vào giỏ hàng
        req.session.cart.push({
            productId,
            name,
            price: parsedPrice,
            image,
            quantity: 1
        });
    }

    res.redirect('/cart');
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
