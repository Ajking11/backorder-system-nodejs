const Product = require('../models/Product');
const Supplier = require('../models/Supplier');

// Display product list
exports.getProducts = async (req, res) => {
  try {
    const search = req.query.search || '';
    const supplierId = req.query.supplier || '';
    const category = req.query.category || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    // Build filter options
    const options = {
      active: 1,
      limit,
      offset
    };

    if (search) {
      options.search = search;
    }

    if (supplierId) {
      options.supplierId = supplierId;
    }

    if (category) {
      options.category = category;
    }

    // Get products
    const products = await Product.getAll(options);
    
    // Get suppliers for filter
    const suppliers = await Supplier.getAll({ active: 1, orderBy: 'supplier_name ASC' });
    
    // Get categories for filter
    const categories = await Product.getCategories();
    
    // Get total count for pagination (approximate)
    const totalCount = products.length < limit ? products.length : limit * page + 1;
    const totalPages = Math.ceil(totalCount / limit);

    res.render('products/index', {
      title: 'Products',
      products,
      filters: {
        search,
        supplierId,
        category
      },
      suppliers,
      categories,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      },
      user: req.session.user
    });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).render('error', {
      message: 'Error loading products',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Display product details
exports.getProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Get product
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).render('error', {
        message: 'Product not found',
        error: {}
      });
    }
    
    // Get product details with supplier information
    const productDetails = await product.getDetails();
    
    // Get active backorders for this product
    const backorders = await product.getBackorders({ completionStatus: 0 });
    
    res.render('products/details', {
      title: 'Product Details',
      product: productDetails,
      backorders,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error getting product details:', error);
    res.status(500).render('error', {
      message: 'Error loading product details',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Display product create form
exports.getCreateProduct = async (req, res) => {
  try {
    // Get suppliers for dropdown
    const suppliers = await Supplier.getAll({ active: 1, orderBy: 'supplier_name ASC' });
    
    // Get categories for dropdown
    const categories = await Product.getCategories();
    
    res.render('products/create', {
      title: 'Create Product',
      suppliers,
      categories,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error loading create product form:', error);
    res.status(500).render('error', {
      message: 'Error loading create product form',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Create product
exports.createProduct = async (req, res) => {
  try {
    const { itemName, itemCode, supplierId, price, category, description } = req.body;
    
    // Validate input
    if (!itemName || !itemCode) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Check if product code already exists
    const existingProduct = await Product.findByCode(itemCode);
    if (existingProduct) {
      if (req.xhr) {
        return res.status(400).json({
          success: false,
          message: 'Product code already exists'
        });
      }
      
      // Get suppliers for dropdown
      const suppliers = await Supplier.getAll({ active: 1, orderBy: 'supplier_name ASC' });
      
      // Get categories for dropdown
      const categories = await Product.getCategories();
      
      return res.render('products/create', {
        title: 'Create Product',
        suppliers,
        categories,
        error: 'Product code already exists',
        formData: req.body,
        user: req.session.user
      });
    }
    
    // Create product
    const productId = await Product.create({
      itemName,
      itemCode,
      supplierId,
      price,
      category,
      description,
      userId: req.session.user.id
    });
    
    if (req.xhr) {
      return res.json({
        success: true,
        message: 'Product created successfully',
        productId
      });
    }
    
    // Redirect to product details
    res.redirect(`/products/${productId}`);
  } catch (error) {
    console.error('Error creating product:', error);
    
    if (req.xhr) {
      return res.status(500).json({
        success: false,
        message: 'Error creating product'
      });
    }
    
    res.status(500).render('error', {
      message: 'Error creating product',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Display product edit form
exports.getEditProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Get product
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).render('error', {
        message: 'Product not found',
        error: {}
      });
    }
    
    // Get product details with supplier information
    const productDetails = await product.getDetails();
    
    // Get suppliers for dropdown
    const suppliers = await Supplier.getAll({ active: 1, orderBy: 'supplier_name ASC' });
    
    // Get categories for dropdown
    const categories = await Product.getCategories();
    
    res.render('products/edit', {
      title: 'Edit Product',
      product: productDetails,
      suppliers,
      categories,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error loading edit product form:', error);
    res.status(500).render('error', {
      message: 'Error loading edit product form',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { itemName, itemCode, supplierId, price, category, description, active } = req.body;
    
    // Get product
    const product = await Product.findById(productId);
    
    if (!product) {
      if (req.xhr) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      return res.status(404).render('error', {
        message: 'Product not found',
        error: {}
      });
    }
    
    // Check if product code already exists and belongs to another product
    if (itemCode !== product.itemCode) {
      const existingProduct = await Product.findByCode(itemCode);
      if (existingProduct && existingProduct.id !== product.id) {
        if (req.xhr) {
          return res.status(400).json({
            success: false,
            message: 'Product code already exists'
          });
        }
        
        // Get product details with supplier information
        const productDetails = await product.getDetails();
        
        // Get suppliers for dropdown
        const suppliers = await Supplier.getAll({ active: 1, orderBy: 'supplier_name ASC' });
        
        // Get categories for dropdown
        const categories = await Product.getCategories();
        
        return res.render('products/edit', {
          title: 'Edit Product',
          product: productDetails,
          suppliers,
          categories,
          error: 'Product code already exists',
          formData: req.body,
          user: req.session.user
        });
      }
    }
    
    // Update product
    const success = await product.update({
      itemName,
      itemCode,
      supplierId,
      price,
      category,
      description,
      active: active === 'on' ? 1 : 0,
      userId: req.session.user.id
    });
    
    if (req.xhr) {
      return res.json({
        success,
        message: success ? 'Product updated successfully' : 'Error updating product'
      });
    }
    
    // Redirect to product details
    res.redirect(`/products/${productId}`);
  } catch (error) {
    console.error('Error updating product:', error);
    
    if (req.xhr) {
      return res.status(500).json({
        success: false,
        message: 'Error updating product'
      });
    }
    
    res.status(500).render('error', {
      message: 'Error updating product',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Get product
    const product = await Product.findById(productId);
    
    if (!product) {
      if (req.xhr) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      return res.status(404).render('error', {
        message: 'Product not found',
        error: {}
      });
    }
    
    // Delete product (soft delete)
    const success = await product.delete();
    
    if (req.xhr) {
      return res.json({
        success,
        message: success ? 'Product deleted successfully' : 'Error deleting product'
      });
    }
    
    // Redirect to products list
    res.redirect('/products');
  } catch (error) {
    console.error('Error deleting product:', error);
    
    if (req.xhr) {
      return res.status(500).json({
        success: false,
        message: 'Error deleting product'
      });
    }
    
    res.status(500).render('error', {
      message: 'Error deleting product',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Search products (API)
exports.searchProducts = async (req, res) => {
  try {
    const term = req.query.term || '';
    const limit = parseInt(req.query.limit) || 10;
    
    if (!term) {
      return res.json([]);
    }
    
    const products = await Product.search(term, limit);
    
    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching products'
    });
  }
};