const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const { isAdmin } = require("../middleware/auth");

// Kiểm tra và tạo thư mục uploads nếu chưa có
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Cấu hình Multer để upload ảnh
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "../uploads")); 
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Tự động thêm danh mục vào MongoDB nếu chưa có
const initializeCategories = async () => {
    try {
        const existingCategories = await Category.find();
        if (existingCategories.length === 0) {
            await Category.insertMany([
                { name: "Điện thoại" },
                { name: "Laptop" },
                { name: "Phụ kiện" }
            ]);
            console.log("✅ Đã thêm danh mục mặc định vào MongoDB");
        }
    } catch (error) {
        console.error("❌ Lỗi khi khởi tạo danh mục:", error);
    }
};
initializeCategories();

// Route hiển thị danh sách sản phẩm
router.get('/', async (req, res) => {
    try {
        let products;
        // Nhận category từ query (vd: /products?category=Phụ kiện)
        let category = req.query.category || "";

        if (category) {
            // Nếu giá trị category là ObjectId hợp lệ thì truy vấn trực tiếp
            if (mongoose.Types.ObjectId.isValid(category)) {
                products = await Product.find({ category }).sort({ _id: -1 });
            } else {
                // Nếu không, coi đó là tên danh mục và tìm _id tương ứng
                const categoryObj = await Category.findOne({ name: category });
                if (categoryObj) {
                    products = await Product.find({ category: categoryObj._id }).sort({ _id: -1 });
                } else {
                    products = [];
                }
            }
        } else {
            products = await Product.find().sort({ _id: -1 });
        }

        res.render('productList', { title: 'Danh sách sản phẩm', products, category });
    } catch (error) {
        console.error("❌ Lỗi lấy danh sách sản phẩm:", error);
        res.render('productList', { title: 'Danh sách sản phẩm', products: [], category: "" });
    }
});

// Hiển thị form thêm sản phẩm (đặt trước route có :id)
router.get("/create", isAdmin, async (req, res) => {
    try {
        const categories = await Category.find();
        res.render("createProduct", { title: "Thêm sản phẩm mới", categories });
    } catch (error) {
        console.error("❌ Lỗi lấy danh mục:", error);
        res.status(500).send("Lỗi lấy danh mục");
    }
});

// Xử lý thêm sản phẩm
router.post("/create", isAdmin,upload.single("image"), async (req, res) => {
    try {
        const { name, price, description, category } = req.body;
        if (!name || !price || !description || !category) {
            return res.status(400).send("❌ Vui lòng nhập đầy đủ thông tin.");
        }
        const categoryExists = await Category.findById(category);
        if (!categoryExists) return res.status(400).send("❌ Danh mục không hợp lệ");
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";
        const newProduct = new Product({ name, price, description, category, image: imageUrl });
        await newProduct.save();
        res.redirect("/products");
    } catch (error) {
        console.error("❌ Lỗi tạo sản phẩm:", error);
        res.status(500).send("Lỗi tạo sản phẩm");
    }
});
//Tìm kiếm sản phẩm 
router.get("/search", async (req, res) => {
    const query = req.query.q;
    try {
      const products = await Product.find({ name: { $regex: query, $options: "i" } });
      
      if (products.length === 1) {
        res.render("productDetail", { product: products[0] });
      } else {
        res.render("searchResults", { products, query });
      }
    } catch (err) {
      console.error(err);
      res.status(500).send("Lỗi server");
    }
  });

// Hiển thị chi tiết sản phẩm
router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).send("❌ ID không hợp lệ");
        }
        const product = await Product.findById(req.params.id).populate("category");
        if (!product) return res.status(404).send("❌ Không tìm thấy sản phẩm");
        res.render("productDetail", { title: product.name, product });
    } catch (error) {
        console.error("❌ Lỗi tải chi tiết sản phẩm:", error);
        res.status(500).send("Lỗi tải chi tiết sản phẩm");
    }
});

// Hiển thị form chỉnh sửa sản phẩm
router.get("/edit/:id", isAdmin,async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        const categories = await Category.find();
        if (!product) return res.status(404).send("❌ Không tìm thấy sản phẩm");
        res.render("editProduct", { title: "Chỉnh sửa sản phẩm", product, categories });
    } catch (error) {
        console.error("❌ Lỗi tải trang chỉnh sửa sản phẩm:", error);
        res.status(500).send("Lỗi tải trang chỉnh sửa sản phẩm");
    }
});

// Xử lý cập nhật sản phẩm
router.post("/edit/:id", isAdmin,upload.single("image"), async (req, res) => {
    try {
        const { name, price, description, category } = req.body;
        if (!name || !price || !description || !category) {
            return res.status(400).send("❌ Vui lòng nhập đầy đủ thông tin.");
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).send("❌ ID không hợp lệ");
        }
        const categoryExists = await Category.findById(category);
        if (!categoryExists) return res.status(400).send("❌ Danh mục không hợp lệ");
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).send("❌ Không tìm thấy sản phẩm");

        let updateData = { name, price, description, category };
        if (req.file) {
            // Xóa ảnh cũ nếu có
            if (product.image) {
                const oldImagePath = path.join(uploadDir, path.basename(product.image));
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            updateData.image = `/uploads/${req.file.filename}`;
        }
        await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.redirect("/products");
    } catch (error) {
        console.error("❌ Lỗi cập nhật sản phẩm:", error);
        res.status(500).send("Lỗi cập nhật sản phẩm");
    }
});

// Xóa sản phẩm (sử dụng phương thức DELETE)
router.delete("/delete/:id", isAdmin,async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).send("❌ ID không hợp lệ");
        }
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).send("❌ Không tìm thấy sản phẩm");

        // Xóa ảnh nếu có
        if (product.image) {
            const imagePath = path.join(uploadDir, path.basename(product.image));
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Xóa sản phẩm khỏi MongoDB
        await Product.findByIdAndDelete(req.params.id);
        res.status(200).send({ message: 'Sản phẩm đã được xóa thành công.' });
    } catch (error) {
        console.error("❌ Lỗi xóa sản phẩm:", error);
        res.status(500).send("Lỗi xóa sản phẩm");
    }
});
module.exports = router;
