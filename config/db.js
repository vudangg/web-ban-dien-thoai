const mongoose = require("mongoose");

const connectDB = async (MONGO_URI) => {
  try {
    if (!MONGO_URI) {
      throw new Error("MONGO_URI không được cung cấp!");
    }
    await mongoose.connect(MONGO_URI);
    console.log("✅ Kết nối MongoDB thành công");
  } catch (err) {
    console.error("❌ Lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
