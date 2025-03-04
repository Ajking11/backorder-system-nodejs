const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

// Customers list
router.get('/', isAuthenticated, (req, res) => {
  res.render('customers/index', {
    title: 'Customers',
    user: req.session.user
  });
});

module.exports = router;