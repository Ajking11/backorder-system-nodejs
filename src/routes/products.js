const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

// Products list
router.get('/', isAuthenticated, (req, res) => {
  res.render('products/index', {
    title: 'Products',
    user: req.session.user
  });
});

module.exports = router;