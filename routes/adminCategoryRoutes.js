const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const roleMiddleware = require('../middleware/roleMiddleware');

// Danh sách + form thêm
router.get('/categories', roleMiddleware('admin'), async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.render('adminCategories', { categories });
});

// Thêm mới
router.post('/categories', roleMiddleware('admin'), async (req, res) => {
  const { name, description } = req.body;
  await Category.create({ name, description });
  res.redirect('/admin/categories');
});

// Sửa
router.get('/categories/edit/:id', roleMiddleware('admin'), async (req, res) => {
  const category = await Category.findById(req.params.id);
  res.render('adminCategoryEdit', { category });
});
router.post('/categories/edit/:id', roleMiddleware('admin'), async (req, res) => {
  const { name, description } = req.body;
  await Category.findByIdAndUpdate(req.params.id, { name, description });
  res.redirect('/admin/categories');
});

// Xoá
router.post('/categories/delete/:id', roleMiddleware('admin'), async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.redirect('/admin/categories');
});

module.exports = router;
