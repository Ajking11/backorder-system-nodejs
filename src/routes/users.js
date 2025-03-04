const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Users list - admin only
router.get('/', isAuthenticated, isAdmin, (req, res) => {
  res.render('users/index', {
    title: 'User Accounts',
    user: req.session.user
  });
});

module.exports = router;