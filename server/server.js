const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const methodOverride = require('method-override');

// Models
const User = require("../models/User");
const Admin = require("../models/Admin");
const Profile = require("../models/Profile");
const Product = require("../models/Product");
const Category = require("../models/Category");

// Routes
const authRoutes = require('../routes/authRoutes');
const registerRoutes = require('../routes/registerRoutes');
const adminRoutes = require('../routes/adminRoutes');
const adminCategoryRoutes = require('../routes/adminCategoryRoutes');
const productRoutes = require("../routes/productRoutes");
const categoryRoutes = require("../routes/categoryRoutes");
const cartRoutes = require("../routes/cartRoutes");
const profileRoutes = require('../routes/profileRoutes');

// Middleware
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Mail service
const sendResetPasswordEmail = require("./mailService");

const app = express();
const PORT = process.env.PORT || 3000;

// Session
app.use(session({
  secret: '12345',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Body parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Expose session user to views and req.user
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  req.user = req.session.user;
  next();
});

// View engine & static
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Public routes
app.use('/auth', authRoutes);
app.use('/register', registerRoutes);
app.use('/admin', adminRoutes);
app.use('/admin', adminCategoryRoutes);

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
  try { await sendResetPasswordEmail(email, u._id); res.send("Đã gửi email đặt lại mật khẩu."); }
  catch { res.send("Lỗi gửi email. Vui lòng thử lại."); }
});
app.get('/reset-password/:token', async (req, res) => {
  const u = await User.findOne({ resetToken: req.params.token, tokenExpiry: { $gt: Date.now() } });
  if (!u) return res.send("Token không hợp lệ. <a href='/forgot-password'>Thử lại</a>");
  res.render('reset-password', { token: req.params.token });
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

// Admin dashboard
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
  if (!profile) profile = await Profile.create({ userId: sid, name: req.session.user.name, email: '', phone: '', address: '' });
  res.render('profile', { user: profile });
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
  let products = await Product.find().sort({ _id: -1 }).limit(6);
  while (products.length < 6) products.push({ image: '/uploads/default.png', name: 'Sản phẩm mẫu', price: 0, _id: '#' });
  res.render('index', { products, user: req.session.user, cart: req.session.cart || [] });
});

// Cart
app.post('/cart/add', (req, res) => {
  const { productId, name, price } = req.body;
  if (!req.session.cart) req.session.cart = [];
  const exist = req.session.cart.find(p => p.productId === productId);
  if (exist) exist.quantity++;
  else req.session.cart.push({ productId, name, price, quantity: 1 });
  res.redirect('/cart');
});

// Multer (used in productRoutes)
const upload = multer({ dest: path.join(__dirname, '../uploads'), limits: { fileSize: 10*1024*1024 } });

// Profile routes mount
app.use('/', profileRoutes);

// Seed categories and admin
async function seedInitialData() {
  const defaultCategories = ["Điện thoại","Laptop","Phụ kiện","Thời trang"];
  for (const name of defaultCategories) {
    if (!await Category.findOne({ name })) await Category.create({ name });
  }
  if (!await Admin.findOne({ username: 'admin' })) {
    const hashed = await bcrypt.hash('admin123',10);
    await Admin.create({ username: 'admin', password: hashed, role: 'admin' });
    console.log('✅ Admin mặc định đã tạo: admin/admin123');
  }
}

const targetUri = "mongodb+srv://annguyen1212004:0963631472An@project.e63li.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(targetUri, { serverSelectionTimeoutMS:5000, socketTimeoutMS:45000, autoIndex:true })
  .then(() => seedInitialData())
  .catch(err => console.error(err));

// Start server
app.listen(PORT, () => console.log(`🚀 Server chạy tại http://localhost:${PORT}`));
