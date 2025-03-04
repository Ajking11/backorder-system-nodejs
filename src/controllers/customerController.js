const Customer = require('../models/Customer');

// Display customer list
exports.getCustomers = async (req, res) => {
  try {
    const search = req.query.search || '';
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

    // Get customers
    const customers = await Customer.getAll(options);
    
    // Get total count for pagination (approximate)
    const totalCount = customers.length < limit ? customers.length : limit * page + 1;
    const totalPages = Math.ceil(totalCount / limit);

    res.render('customers/index', {
      title: 'Customers',
      customers,
      filters: {
        search
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      },
      user: req.session.user
    });
  } catch (error) {
    console.error('Error getting customers:', error);
    res.status(500).render('error', {
      message: 'Error loading customers',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Display customer details
exports.getCustomerDetails = async (req, res) => {
  try {
    const customerId = req.params.id;
    
    // Get customer
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).render('error', {
        message: 'Customer not found',
        error: {}
      });
    }
    
    // Get active backorders for this customer
    const backorders = await customer.getBackorders({ completionStatus: 0 });
    
    // Get customer statistics
    const statistics = await customer.getStatistics();
    
    res.render('customers/details', {
      title: 'Customer Details',
      customer,
      backorders,
      statistics,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error getting customer details:', error);
    res.status(500).render('error', {
      message: 'Error loading customer details',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Display customer create form
exports.getCreateCustomer = async (req, res) => {
  try {
    res.render('customers/create', {
      title: 'Create Customer',
      user: req.session.user
    });
  } catch (error) {
    console.error('Error loading create customer form:', error);
    res.status(500).render('error', {
      message: 'Error loading create customer form',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Create customer
exports.createCustomer = async (req, res) => {
  try {
    const { customerName, customerCode, contactName, contactNumber, email, address, notes } = req.body;
    
    // Validate input
    if (!customerName || !customerCode) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Check if customer code already exists
    const existingCustomer = await Customer.findByCode(customerCode);
    if (existingCustomer) {
      if (req.xhr) {
        return res.status(400).json({
          success: false,
          message: 'Customer code already exists'
        });
      }
      
      return res.render('customers/create', {
        title: 'Create Customer',
        error: 'Customer code already exists',
        formData: req.body,
        user: req.session.user
      });
    }
    
    // Create customer
    const customerId = await Customer.create({
      customerName,
      customerCode,
      contactName,
      contactNumber,
      email,
      address,
      notes,
      userId: req.session.user.id
    });
    
    if (req.xhr) {
      return res.json({
        success: true,
        message: 'Customer created successfully',
        customerId
      });
    }
    
    // Redirect to customer details
    res.redirect(`/customers/${customerId}`);
  } catch (error) {
    console.error('Error creating customer:', error);
    
    if (req.xhr) {
      return res.status(500).json({
        success: false,
        message: 'Error creating customer'
      });
    }
    
    res.status(500).render('error', {
      message: 'Error creating customer',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Display customer edit form
exports.getEditCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    
    // Get customer
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).render('error', {
        message: 'Customer not found',
        error: {}
      });
    }
    
    res.render('customers/edit', {
      title: 'Edit Customer',
      customer,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error loading edit customer form:', error);
    res.status(500).render('error', {
      message: 'Error loading edit customer form',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    const { customerName, customerCode, contactName, contactNumber, email, address, notes, active } = req.body;
    
    // Get customer
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      if (req.xhr) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      
      return res.status(404).render('error', {
        message: 'Customer not found',
        error: {}
      });
    }
    
    // Check if customer code already exists and belongs to another customer
    if (customerCode !== customer.customerCode) {
      const existingCustomer = await Customer.findByCode(customerCode);
      if (existingCustomer && existingCustomer.id !== customer.id) {
        if (req.xhr) {
          return res.status(400).json({
            success: false,
            message: 'Customer code already exists'
          });
        }
        
        return res.render('customers/edit', {
          title: 'Edit Customer',
          customer,
          error: 'Customer code already exists',
          formData: req.body,
          user: req.session.user
        });
      }
    }
    
    // Update customer
    const success = await customer.update({
      customerName,
      customerCode,
      contactName,
      contactNumber,
      email,
      address,
      notes,
      active: active === 'on' ? 1 : 0,
      userId: req.session.user.id
    });
    
    if (req.xhr) {
      return res.json({
        success,
        message: success ? 'Customer updated successfully' : 'Error updating customer'
      });
    }
    
    // Redirect to customer details
    res.redirect(`/customers/${customerId}`);
  } catch (error) {
    console.error('Error updating customer:', error);
    
    if (req.xhr) {
      return res.status(500).json({
        success: false,
        message: 'Error updating customer'
      });
    }
    
    res.status(500).render('error', {
      message: 'Error updating customer',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Delete customer
exports.deleteCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    
    // Get customer
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      if (req.xhr) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      
      return res.status(404).render('error', {
        message: 'Customer not found',
        error: {}
      });
    }
    
    // Delete customer (soft delete)
    const success = await customer.delete();
    
    if (req.xhr) {
      return res.json({
        success,
        message: success ? 'Customer deleted successfully' : 'Error deleting customer'
      });
    }
    
    // Redirect to customers list
    res.redirect('/customers');
  } catch (error) {
    console.error('Error deleting customer:', error);
    
    if (req.xhr) {
      return res.status(500).json({
        success: false,
        message: 'Error deleting customer'
      });
    }
    
    res.status(500).render('error', {
      message: 'Error deleting customer',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

// Search customers (API)
exports.searchCustomers = async (req, res) => {
  try {
    const term = req.query.term || '';
    const limit = parseInt(req.query.limit) || 10;
    
    if (!term) {
      return res.json([]);
    }
    
    const customers = await Customer.search(term, limit);
    
    res.json(customers);
  } catch (error) {
    console.error('Error searching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching customers'
    });
  }
};