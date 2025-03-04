const User = require('../models/User');

// Middleware to check if user is authenticated
const isAuthenticated = async (req, res, next) => {
  // Check if user is logged in via session
  if (req.session.user) {
    return next();
  }
  
  // Check if user has remember cookie
  const rememberToken = req.cookies[process.env.COOKIE_NAME];
  if (rememberToken) {
    try {
      const user = await User.verifyRememberToken(rememberToken);
      if (user) {
        // Set session
        req.session.user = {
          id: user.id,
          username: user.username,
          name: user.name
        };
        return next();
      }
    } catch (error) {
      console.error('Remember token verification error:', error);
    }
  }
  
  // Not authenticated, redirect to login
  res.redirect('/login');
};

// Middleware to check if user is a guest (not logged in)
const isGuest = (req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  
  // Already logged in, redirect to dashboard
  res.redirect('/dashboard');
};

// Middleware to check if user has admin permissions
const isAdmin = async (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  try {
    const user = await User.find(req.session.user.id);
    if (!user) {
      return res.redirect('/login');
    }
    
    // Check if user is in admin group (group 2)
    if (user.group === 2) {
      return next();
    }
    
    // Not an admin, redirect to dashboard with error
    req.session.error = 'You do not have permission to access this page';
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Admin check error:', error);
    res.redirect('/dashboard');
  }
};

module.exports = {
  isAuthenticated,
  isGuest,
  isAdmin
};