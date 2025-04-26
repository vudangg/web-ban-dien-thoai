const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");

// Định nghĩa các route cho danh mục
router.get("/", categoryController.getCategories);
router.post("/", categoryController.createCategory);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);
// API lấy danh sách danh mục
router.get("/", async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy danh mục" });
    }
});
module.exports = router;
