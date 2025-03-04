const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

// Suppliers list
router.get('/', isAuthenticated, (req, res) => {
  res.render('suppliers/index', {
    title: 'Suppliers',
    user: req.session.user
  });
});

module.exports = router;