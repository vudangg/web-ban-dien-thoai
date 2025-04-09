const nodemailer = require("nodemailer");

// Tạo transporter sử dụng Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'annguyen1212004@gmail.com', // Thay bằng email của bạn
        pass: 'esns kpvb wfwf lczv'    // Thay bằng mật khẩu hoặc App Password của bạn
    }
});

// Hàm gửi email đặt lại mật khẩu
const sendResetPasswordEmail = async (recipientEmail, user) => {
    const token = crypto.randomBytes(32).toString("hex"); // Tạo token ngẫu nhiên
    user.resetToken = token;
    user.tokenExpiry = Date.now() + 3600000; // Token có hiệu lực trong 1 giờ
    await user.save();

    const resetLink = `http://localhost:3000/reset-password/${token}`;

    const mailOptions = {
        from: 'your-email@gmail.com',
        to: recipientEmail,
        subject: "Đặt lại mật khẩu",
        html: `<p>Nhấn vào link sau để đặt lại mật khẩu: <a href="${resetLink}">${resetLink}</a></p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.error("Lỗi gửi email:", error);
        else console.log("Email gửi thành công:", info.response);
    });
};

module.exports = sendResetPasswordEmail;
