const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
// Models
const User = require("../models/User");
const Admin = require("../models/Admin");
const Profile = require("../models/Profile");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Order = require('../models/Order');
// Routes
const authRoutes = require('../routes/authRoutes');
const registerRoutes = require('../routes/registerRoutes');
const adminRoutes = require('../routes/adminRoutes');
const adminCategoryRoutes = require('../routes/adminCategoryRoutes');
const productRoutes = require("../routes/productRoutes");
const categoryRoutes = require("../routes/categoryRoutes");
const cartRoutes = require("../routes/cartRoutes");
const profileRoutes = require('../routes/profileRoutes');
const userRoutes = require('../routes/userRoutes');
// Middleware
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
// Mail service
const sendResetPasswordEmail = require("./mailService");

const app = express();
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 3000;

/// Session middleware
app.use(session({
  secret: '12345',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 60 * 60 * 1000
  }
}));

// ✅ Middleware expose session user (ĐÃ SỬA ĐÚNG)
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  req.user = req.session.user;
  next();
});


// Body parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(cookieParser());
// View engine & static
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Public routes
app.use('/auth', authRoutes);
app.use('/register', registerRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/categories', adminCategoryRoutes);
app.use('/', userRoutes);
// Login routes
app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
  let { username, password } = req.body;
  username = username.trim().toLowerCase();

  let user = await User.findOne({ username });
  if (!user) user = await Admin.findOne({ username });
  if (!user) return res.send("Tài khoản không tồn tại. <a href='/login'>Thử lại</a>");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.send("Sai mật khẩu. <a href='/login'>Thử lại</a>");

  req.session.user = {
    id: user._id,
    username: user.username,
    name: user.name || 'Admin',
    role: user.role || 'admin'
  };
  if (req.session.user.role === 'admin') return res.redirect('/admin');
  switch (req.session.user.role) {
    case 'admin': return res.redirect('/admin');
    case 'moderator': return res.redirect('/moderator');
    default: return res.redirect('/');
  }
});
app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

// Password reset
app.get('/forgot-password', (req, res) => res.render('forgot-password'));
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const u = await User.findOne({ email });
  if (!u) return res.send("Email không tồn tại. <a href='/forgot-password'>Thử lại</a>");
  try {
    const token = crypto.randomBytes(20).toString('hex');
    u.resetToken = token;
    u.tokenExpiry = Date.now() + 3600000; // 1 tiếng
    await u.save();
    await sendResetPasswordEmail(email, token); // ✅ gửi token, không gửi _id
    res.send("Đã gửi email đặt lại mật khẩu.");
  } catch {
    res.send("Lỗi gửi email. Vui lòng thử lại.");
  }
});
app.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  console.log('Received reset token:', token);
  const user = await User.findOne({ resetToken: token });
  if (!user) {
    return res.send(`
      <p>Token không hợp lệ.</p>
      <a href="/forgot-password">Quên mật khẩu</a>
    `);
  }
  if (user.tokenExpiry < Date.now()) {
    return res.send(`
      <p>Link đã hết hạn (hết hạn vào ${user.tokenExpiry.toLocaleString()}).</p>
      <a href="/forgot-password">Gửi lại email đặt lại mật khẩu</a>
    `);
  }
  res.render('reset-password', { token });
});
app.post('/reset-password', async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  if (password !== confirmPassword) return res.send("Mật khẩu không khớp.");
  const u = await User.findOne({ resetToken: token, tokenExpiry: { $gt: Date.now() } });
  if (!u) return res.send("Token không hợp lệ.");
  u.password = await bcrypt.hash(password, 10);
  u.resetToken = u.tokenExpiry = undefined;
  await u.save();
  res.send("Mật khẩu đã đặt lại. <a href='/login'>Đăng nhập</a>");     
});

// Public APIs
app.use('/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use(cartRoutes);
app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);
  const products = await Product.find({ name: { $regex: q, $options: 'i' } }).limit(5);
  res.json(products);
});

// Authenticated routes
app.use(authMiddleware);

// Admin dashboard page
app.get('/admin', roleMiddleware('admin'), async (req, res) => {
  const userCount     = await User.countDocuments();
  const productCount  = await Product.countDocuments();
  const categoryCount = await Category.countDocuments();
  res.render('adminDashboard', { userCount, productCount, categoryCount });
});
app.get('/moderator', roleMiddleware('moderator'), (req, res) => res.render('moderatorDashboard'));

// Profile routes
app.get('/userProfile', async (req, res) => {
  const sid = req.session.user?.id;
  if (!sid) return res.redirect('/login');
  const profile = await Profile.findOne({ userId: sid });
  if (!profile) return res.redirect('/profile/edit');
  res.render('userProfile', { user: profile });
});
app.get('/profile/edit', async (req, res) => {
  const sid = req.session.user?.id;
  if (!sid) return res.redirect('/login');
  let profile = await Profile.findOne({ userId: sid });
  if (!profile) {
    profile = await Profile.create({
      userId: sid,
      name: req.session.user.name,
      email: '',
      phone: '',
      address: ''
    });
  }
  res.render('profile', { user: profile, errors: {} });
});
app.post('/profile', async (req, res) => {
  const sid = req.session.user.id;
  const { name, email, phone, address } = req.body;
  const errors = {};
  const emailExists = await Profile.findOne({ email, userId: { $ne: sid } });
  if (emailExists) errors.email = 'Email đã được sử dụng. Vui lòng chọn email khác.';
  const phoneExists = await Profile.findOne({ phone, userId: { $ne: sid } });
  if (phoneExists) errors.phone = 'Số điện thoại đã được sử dụng. Vui lòng chọn số khác.';
  if (Object.keys(errors).length > 0) {
    return res.render('profile', { user: { name, email, phone, address }, errors });
  }
  const updated = await Profile.findOneAndUpdate(
    { userId: sid },
    { name, email, phone, address, updatedAt: Date.now() },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  req.session.user.name = updated.name;
  res.redirect('/userProfile');
});
app.get('/profile', async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.render('editProfile', { user, errors: null });
});
app.post('/profile', async (req, res) => {
  const sid = req.session.user.id;
  const { name, email, phone, address } = req.body;
  const updated = await Profile.findOneAndUpdate(
    { userId: sid },
    { name, email, phone, address, updatedAt: Date.now() },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  req.session.user.name = updated.name;
  res.redirect('/userProfile');
});

// Home
app.get('/', async (req, res) => {
  const hotSaleProducts = await Product.find({ hotSale: true }).limit(6);
  const otherProducts = await Product.find({ hotSale: false })
    .sort({ _id: -1 })
    .limit(12);
  const hotSaleEndTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
  res.render('index', {
    hotSaleProducts,
    otherProducts,
    hotSaleEndTime: hotSaleEndTime.toISOString(),
    user: req.session.user,
    cart: req.session.cart || []
  });
});

// Cart
app.post('/cart/add', (req, res) => {
  // Lấy thêm color và capacity từ form
  const { productId, name, price, color, capacity } = req.body;
  if (!req.session.cart) req.session.cart = [];

  // Tìm xem đã có cùng productId + color + capacity chưa
  const exist = req.session.cart.find(item =>
    item.productId === productId &&
    item.color      === color &&
    item.capacity   === capacity
  );

  if (exist) {
    // Nếu trùng tuỳ chọn, tăng số lượng
    exist.quantity++;
  } else {
    // Khởi tạo một mục mới với color & capacity
    req.session.cart.push({
      productId,
      name,
      price: priceNum,
      color,
      capacity,
      quantity: 1
    });
  }
  req.session.successMessage = 'Đã thêm vào giỏ hàng!';
  res.redirect('/cart');
});


// Multer (used in productRoutes)
const upload = multer({ dest: path.join(__dirname, '../uploads'), limits: { fileSize: 10*1024*1024 } });

// Profile routes mount
app.use('/', profileRoutes);

// Seed categories and admin
async function seedInitialData() {
  const categoryCount = await Category.countDocuments();
  if (categoryCount === 0) {
    const defaultCategories = ["Điện thoại", "Laptop", "Phụ kiện"];
    await Category.insertMany(defaultCategories.map(name => ({ name })));
    console.log('✅ Đã seed các danh mục mặc định');
  }
  if (!await Admin.findOne({ username: 'admin' })) {
    const hashed = await bcrypt.hash('admin123', 10);
    await Admin.create({ username: 'admin', password: hashed, role: 'admin' });
    console.log('✅ Admin mặc định đã tạo: admin/admin123');
  }
}

// —— CẬP NHẬT /api/dashboard-data —— 
app.get('/api/dashboard-data', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end   = new Date(year, 11, 31, 23, 59, 59);

    // 1) Thống kê số sản phẩm theo tháng
    const productAgg = await Product.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 }
      }},
      { $sort: { '_id': 1 } }
    ]);
    const monthlyProductCount = Array.from({ length: 12 }, (_, i) => {
      const m = productAgg.find(p => p._id === i + 1);
      return m ? m.count : 0;
    });

    // 2) Thống kê số lượng theo danh mục
    const categories = {};
    const cats = await Category.find().lean();
    for (let c of cats) {
      const cnt = await Product.countDocuments({ category: c._id });
      categories[c.name] = cnt;
    }

    // 3) Thống kê người dùng theo role
    const usersAgg = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const users = {};
    usersAgg.forEach(u => { users[u._id] = u.count; });

    res.json({ monthlyProductCount, categories, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
// Route dành cho admin: Lấy tất cả đơn hàng
app.get('/admin/orders', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const orders = await Order.find().populate('userId').populate('items.productId');
    res.render('orders', { orders });
  } catch (error) {
    console.error("Lỗi khi lấy đơn hàng của admin:", error);
    res.status(500).render('orders', {
      orders: [],
      errorMessage: 'Đã xảy ra lỗi khi tải đơn hàng.'
    });
  }
});

// Route dành cho khách hàng: Lấy đơn hàng của chính user đó
app.get('/customerOrders', isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).populate('items.productId');
    res.render('customerOrders', { user: req.user, orders });
  } catch (error) {
    console.error("Lỗi khi lấy đơn hàng của khách hàng:", error);
    res.status(500).send('Lỗi khi lấy danh sách đơn hàng.');
  }
});


app.post('/orders/:id/update-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await Order.findByIdAndUpdate(id, { status });
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi cập nhật đơn hàng' });
  }
});
// ——————————————————————————

/**
 * 404 & 500 handlers
 */
app.use((req, res) => {
  res.status(404).render('error', {
    statusCode: 404,
    message: 'Trang bạn tìm không tồn tại.'
  });
});
app.use((err, req, res, next) => {
  console.error("Lỗi server:", err);
  res.status(500).render('error', {
    statusCode: 500,
    message: 'Đã xảy ra lỗi trong hệ thống. Vui lòng thử lại sau.'
  });
});

const targetUri = "mongodb+srv://annguyen1212004:0963631472An@project.e63li.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(targetUri, { serverSelectionTimeoutMS:5000, socketTimeoutMS:45000, autoIndex:true })
  .then(() => seedInitialData())
  .catch(err => console.error(err));

// Start server
app.listen(PORT, () => console.log(`🚀 Server chạy tại http://localhost:${PORT}`));
