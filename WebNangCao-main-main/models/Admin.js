const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
    username: String,
  password: String,
  role: {
    type: String,
    default: 'admin'
  }
});

const Admin = mongoose.model('Admin', adminSchema); // ← tên 'Admin' -> tạo collection là 'admins'
module.exports = Admin;
