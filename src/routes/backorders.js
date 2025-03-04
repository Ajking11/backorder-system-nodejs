const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const backorderController = require('../controllers/backorderController');

// Backorders list
router.get('/', isAuthenticated, backorderController.getBackorders);

// Backorders database (all backorders including completed/cancelled)
router.get('/database', isAuthenticated, (req, res) => {
  res.render('backorders/database', {
    title: 'Backorders Database',
    user: req.session.user
  });
});

// Create backorder form
router.get('/create', isAuthenticated, backorderController.getCreateBackorder);

// Create backorder
router.post('/create', isAuthenticated, backorderController.createBackorder);

// Backorder details
router.get('/:id', isAuthenticated, backorderController.getBackorderDetails);

// Edit backorder form
router.get('/:id/edit', isAuthenticated, backorderController.getEditBackorder);

// Update backorder
router.post('/:id/update', isAuthenticated, backorderController.updateBackorder);

// Complete backorder
router.post('/:id/complete', isAuthenticated, backorderController.completeBackorder);

// Cancel backorder
router.post('/:id/cancel', isAuthenticated, backorderController.cancelBackorder);

// Delete backorder
router.post('/:id/delete', isAuthenticated, backorderController.deleteBackorder);

module.exports = router;