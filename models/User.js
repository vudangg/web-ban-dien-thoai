const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Tạo schema cho người dùng
const userSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Thêm trường name
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetToken:    { type: String },
    tokenExpiry:   { type: Date },
    role:{ type: String, enum: ['user', 'admin'], default: 'user' },}, {
        timestamps: true
});

// Mã hóa mật khẩu trước khi lưu vào MongoDB
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        try {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Phương thức so sánh mật khẩu khi đăng nhập
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Tạo mô hình và chỉ định sử dụng collection `user` trong MongoDB
const User = mongoose.model('User', userSchema, 'user'); 

module.exports = User;
