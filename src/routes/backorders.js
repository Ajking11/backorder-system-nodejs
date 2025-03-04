const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

// Backorders list
router.get('/', isAuthenticated, (req, res) => {
  res.render('backorders/index', {
    title: 'Backorders',
    user: req.session.user
  });
});

// Backorders database
router.get('/database', isAuthenticated, (req, res) => {
  res.render('backorders/database', {
    title: 'Backorders Database',
    user: req.session.user
  });
});

module.exports = router;