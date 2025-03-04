const Backorder = require('../models/Backorder');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

// Display backorder list
exports.getBackorders = async (req, res) => {
  try {
    const status = req.query.status || '';
    const customerId = req.query.customer || '';
    const supplierId = req.query.supplier || '';
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    // Build filter options
    const options = {
      completionStatus: 0, // Only active backorders
      limit,
      offset
    };

    if (status) {
      options.status = status;
    }

    if (customerId) {
      options.customerId = customerId;
    }

    // Get backorders
    const backorders = await Backorder.getAll(options);
    
    // Get statistics
    const statistics = await Backorder.getStatistics();
    
    // Get customers and suppliers for filters
    const customers = await Customer.getAll({ active: 1, orderBy: 'customer_name ASC' });
    const suppliers = await Supplier.getAll({ active: 1, orderBy: 'supplier_name ASC' });

    // Get total count for pagination
    const totalCount = statistics.totals.active;
    const totalPages = Math.ceil(totalCount / limit);

    res.render('backorders/index', {
      title: 'Backorders',
      backorders,
      statistics,
      filters: {
        status,
        customerId,
        supplierId,
        search
      },
      customers,
      suppliers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      },
      user: req.session.user
    });
  } catch (error) {
    console.error('Error getting backorders:', error);
    res.status(500).render('error', {
      message: 'Error loading backorders',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Display backorder details
exports.getBackorderDetails = async (req, res) => {
  try {
    const backorderId = req.params.id;
    
    // Get backorder
    const backorder = await Backorder.findById(backorderId);
    
    if (!backorder) {
      return res.status(404).render('error', {
        message: 'Backorder not found',
        error: {}
      });
    }
    
    // Get backorder details with related data
    const backorderDetails = await backorder.getDetails();
    
    res.render('backorders/details', {
      title: 'Backorder Details',
      backorder: backorderDetails,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error getting backorder details:', error);
    res.status(500).render('error', {
      message: 'Error loading backorder details',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Display backorder create form
exports.getCreateBackorder = async (req, res) => {
  try {
    // Get customers and products for dropdowns
    const customers = await Customer.getAll({ active: 1, orderBy: 'customer_name ASC' });
    const products = await Product.getAll({ active: 1, orderBy: 'item_name ASC', limit: 100 });
    
    res.render('backorders/create', {
      title: 'Create Backorder',
      customers,
      products,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error loading create backorder form:', error);
    res.status(500).render('error', {
      message: 'Error loading create backorder form',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Create backorder
exports.createBackorder = async (req, res) => {
  try {
    const { itemId, customerId, quantity, status, notes } = req.body;
    
    // Validate input
    if (!itemId || !customerId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Create backorder
    const backorderId = await Backorder.create({
      itemId,
      customerId,
      quantity,
      status: status || 'Noted',
      notes,
      userId: req.session.user.id
    });
    
    if (req.xhr) {
      return res.json({
        success: true,
        message: 'Backorder created successfully',
        backorderId
      });
    }
    
    // Redirect to backorder details
    res.redirect(`/backorders/${backorderId}`);
  } catch (error) {
    console.error('Error creating backorder:', error);
    
    if (req.xhr) {
      return res.status(500).json({
        success: false,
        message: 'Error creating backorder'
      });
    }
    
    res.status(500).render('error', {
      message: 'Error creating backorder',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Display backorder edit form
exports.getEditBackorder = async (req, res) => {
  try {
    const backorderId = req.params.id;
    
    // Get backorder
    const backorder = await Backorder.findById(backorderId);
    
    if (!backorder) {
      return res.status(404).render('error', {
        message: 'Backorder not found',
        error: {}
      });
    }
    
    // Get backorder details with related data
    const backorderDetails = await backorder.getDetails();
    
    // Get customers and products for dropdowns
    const customers = await Customer.getAll({ active: 1, orderBy: 'customer_name ASC' });
    const products = await Product.getAll({ active: 1, orderBy: 'item_name ASC', limit: 100 });
    
    res.render('backorders/edit', {
      title: 'Edit Backorder',
      backorder: backorderDetails,
      customers,
      products,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error loading edit backorder form:', error);
    res.status(500).render('error', {
      message: 'Error loading edit backorder form',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Update backorder
exports.updateBackorder = async (req, res) => {
  try {
    const backorderId = req.params.id;
    const { itemId, customerId, quantity, status, notes } = req.body;
    
    // Get backorder
    const backorder = await Backorder.findById(backorderId);
    
    if (!backorder) {
      if (req.xhr) {
        return res.status(404).json({
          success: false,
          message: 'Backorder not found'
        });
      }
      
      return res.status(404).render('error', {
        message: 'Backorder not found',
        error: {}
      });
    }
    
    // Update backorder
    const success = await backorder.update({
      itemId,
      customerId,
      quantity,
      status,
      notes,
      userId: req.session.user.id
    });
    
    if (req.xhr) {
      return res.json({
        success,
        message: success ? 'Backorder updated successfully' : 'Error updating backorder'
      });
    }
    
    // Redirect to backorder details
    res.redirect(`/backorders/${backorderId}`);
  } catch (error) {
    console.error('Error updating backorder:', error);
    
    if (req.xhr) {
      return res.status(500).json({
        success: false,
        message: 'Error updating backorder'
      });
    }
    
    res.status(500).render('error', {
      message: 'Error updating backorder',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Complete backorder
exports.completeBackorder = async (req, res) => {
  try {
    const backorderId = req.params.id;
    
    // Get backorder
    const backorder = await Backorder.findById(backorderId);
    
    if (!backorder) {
      if (req.xhr) {
        return res.status(404).json({
          success: false,
          message: 'Backorder not found'
        });
      }
      
      return res.status(404).render('error', {
        message: 'Backorder not found',
        error: {}
      });
    }
    
    // Complete backorder
    const success = await backorder.complete();
    
    if (req.xhr) {
      return res.json({
        success,
        message: success ? 'Backorder completed successfully' : 'Error completing backorder'
      });
    }
    
    // Redirect to backorders list
    res.redirect('/backorders');
  } catch (error) {
    console.error('Error completing backorder:', error);
    
    if (req.xhr) {
      return res.status(500).json({
        success: false,
        message: 'Error completing backorder'
      });
    }
    
    res.status(500).render('error', {
      message: 'Error completing backorder',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Cancel backorder
exports.cancelBackorder = async (req, res) => {
  try {
    const backorderId = req.params.id;
    
    // Get backorder
    const backorder = await Backorder.findById(backorderId);
    
    if (!backorder) {
      if (req.xhr) {
        return res.status(404).json({
          success: false,
          message: 'Backorder not found'
        });
      }
      
      return res.status(404).render('error', {
        message: 'Backorder not found',
        error: {}
      });
    }
    
    // Cancel backorder
    const success = await backorder.cancel();
    
    if (req.xhr) {
      return res.json({
        success,
        message: success ? 'Backorder cancelled successfully' : 'Error cancelling backorder'
      });
    }
    
    // Redirect to backorders list
    res.redirect('/backorders');
  } catch (error) {
    console.error('Error cancelling backorder:', error);
    
    if (req.xhr) {
      return res.status(500).json({
        success: false,
        message: 'Error cancelling backorder'
      });
    }
    
    res.status(500).render('error', {
      message: 'Error cancelling backorder',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Delete backorder
exports.deleteBackorder = async (req, res) => {
  try {
    const backorderId = req.params.id;
    
    // Get backorder
    const backorder = await Backorder.findById(backorderId);
    
    if (!backorder) {
      if (req.xhr) {
        return res.status(404).json({
          success: false,
          message: 'Backorder not found'
        });
      }
      
      return res.status(404).render('error', {
        message: 'Backorder not found',
        error: {}
      });
    }
    
    // Delete backorder
    const success = await backorder.delete();
    
    if (req.xhr) {
      return res.json({
        success,
        message: success ? 'Backorder deleted successfully' : 'Error deleting backorder'
      });
    }
    
    // Redirect to backorders list
    res.redirect('/backorders');
  } catch (error) {
    console.error('Error deleting backorder:', error);
    
    if (req.xhr) {
      return res.status(500).json({
        success: false,
        message: 'Error deleting backorder'
      });
    }
    
    res.status(500).render('error', {
      message: 'Error deleting backorder',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};