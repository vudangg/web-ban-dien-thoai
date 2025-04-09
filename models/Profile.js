// models/Profile.js (hoặc models/Customer.js)
const mongoose = require('mongoose');

// Tạo schema cho thông tin profile của người dùng
const ProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // Liên kết với User
    name: String,
    email: { type: String, unique: true },
    phone: String,
    address: String,
    password: String,  // Nếu bạn có mật khẩu trong profile
    updatedAt: { type: Date, default: Date.now },},{
        collection: 'profiles'  
});

// Tạo mô hình Customer (hoặc Profile)
const Customer = mongoose.model('Profile', ProfileSchema);

module.exports = Customer;
