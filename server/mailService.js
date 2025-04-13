// services/mailService.js
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("../models/User");

async function sendResetPasswordEmail(recipientEmail, userId) {
  // 1. Tạo token và lưu vào user
  const token = crypto.randomBytes(32).toString("hex");
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.resetToken  = token;
  user.tokenExpiry = Date.now() + 3600000; // 1 giờ
  await user.save();

  // 2. Cấu hình transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'annguyen1212004@gmail.com',
      pass: 'esns kpvb wfwf lczv'  // App Password của bạn
    }
  });

  const resetLink = `http://localhost:3000/reset-password/${token}`;
  const mailOptions = {
    from:    'annguyen1212004@gmail.com',
    to:      recipientEmail,
    subject: 'Đặt lại mật khẩu',
    html:    `<p>Nhấn vào link sau để đặt lại mật khẩu:</p>
              <a href="${resetLink}">${resetLink}</a>`
  };

  // 3. Gửi mail và await để catch lỗi
  await transporter.sendMail(mailOptions);
}

module.exports = sendResetPasswordEmail;
