const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isAuthenticated, isGuest } = require('../middleware/auth');

// Login page
router.get('/login', isGuest, (req, res) => {
  res.render('auth/login', {
    title: 'Login',
    errors: req.session.errors || []
  });
  // Clear any session errors
  req.session.errors = [];
});

// Login process
router.post('/login', isGuest, async (req, res) => {
  try {
    const { username, password, remember } = req.body;
    const rememberMe = remember === 'on';
    
    // Validate input
    const errors = [];
    if (!username) errors.push('Username is required');
    if (!password) errors.push('Password is required');
    
    if (errors.length > 0) {
      req.session.errors = errors;
      return res.redirect('/login');
    }
    
    // Attempt login
    const result = await User.login(username, password, rememberMe);
    
    if (!result.success) {
      req.session.errors = [result.message];
      return res.redirect('/login');
    }
    
    // Set session
    req.session.user = {
      id: result.user.id,
      username: result.user.username,
      name: result.user.name
    };
    
    // Set remember cookie if requested
    if (rememberMe && result.rememberToken) {
      res.cookie(process.env.COOKIE_NAME, result.rememberToken, {
        maxAge: parseInt(process.env.COOKIE_EXPIRY) || 31104000000, // Default to 1 year
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });
    }
    
    // Redirect to dashboard
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    req.session.errors = ['An unexpected error occurred'];
    res.redirect('/login');
  }
});

// Logout
router.get('/logout', isAuthenticated, async (req, res) => {
  try {
    if (req.session.user) {
      const user = await User.find(req.session.user.id);
      if (user) {
        await user.logout();
      }
    }
    
    // Clear session and cookie
    req.session.destroy();
    res.clearCookie(process.env.COOKIE_NAME);
    
    res.redirect('/login');
  } catch (error) {
    console.error('Logout error:', error);
    res.redirect('/dashboard');
  }
});

// Register page
router.get('/register', isGuest, (req, res) => {
  res.render('auth/register', {
    title: 'Register',
    errors: req.session.errors || []
  });
  // Clear any session errors
  req.session.errors = [];
});

// Register process
router.post('/register', isGuest, async (req, res) => {
  try {
    const { username, password, password_confirm, name } = req.body;
    
    // Validate input
    const errors = [];
    if (!username) errors.push('Username is required');
    if (!password) errors.push('Password is required');
    if (password !== password_confirm) errors.push('Passwords do not match');
    if (!name) errors.push('Name is required');
    
    if (errors.length > 0) {
      req.session.errors = errors;
      return res.redirect('/register');
    }
    
    // Check if username already exists
    const existingUser = await User.find(username);
    if (existingUser) {
      req.session.errors = ['Username already exists'];
      return res.redirect('/register');
    }
    
    // Create user
    const userId = await User.create({
      username,
      password,
      name
    });
    
    if (!userId) {
      req.session.errors = ['Failed to create user'];
      return res.redirect('/register');
    }
    
    // Redirect to login
    req.session.success = 'Registration successful. Please login.';
    res.redirect('/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.session.errors = ['An unexpected error occurred'];
    res.redirect('/register');
  }
});

// Root route - redirect to dashboard if logged in, otherwise to login
router.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

module.exports = router;