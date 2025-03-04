const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const productController = require('../controllers/productController');

// Products list
router.get('/', isAuthenticated, productController.getProducts);

// Create product form
router.get('/create', isAuthenticated, productController.getCreateProduct);

// Create product
router.post('/create', isAuthenticated, productController.createProduct);

// Product search API
router.get('/search', isAuthenticated, productController.searchProducts);

// Product details
router.get('/:id', isAuthenticated, productController.getProductDetails);

// Edit product form
router.get('/:id/edit', isAuthenticated, productController.getEditProduct);

// Update product
router.post('/:id/update', isAuthenticated, productController.updateProduct);

// Delete product
router.post('/:id/delete', isAuthenticated, productController.deleteProduct);

module.exports = router;