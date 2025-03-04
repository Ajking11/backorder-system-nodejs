const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const customerController = require('../controllers/customerController');

// Customers list
router.get('/', isAuthenticated, customerController.getCustomers);

// Create customer form
router.get('/create', isAuthenticated, customerController.getCreateCustomer);

// Create customer
router.post('/create', isAuthenticated, customerController.createCustomer);

// Customer search API
router.get('/search', isAuthenticated, customerController.searchCustomers);

// Customer details
router.get('/:id', isAuthenticated, customerController.getCustomerDetails);

// Edit customer form
router.get('/:id/edit', isAuthenticated, customerController.getEditCustomer);

// Update customer
router.post('/:id/update', isAuthenticated, customerController.updateCustomer);

// Delete customer
router.post('/:id/delete', isAuthenticated, customerController.deleteCustomer);

module.exports = router;