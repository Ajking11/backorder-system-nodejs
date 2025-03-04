const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Database = require('../models/Database');
const User = require('../models/User');
const { pool } = require('../config/database');

// Dashboard page
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const db = Database.getInstance();
    const user = await User.find(req.session.user.id);
    
    if (!user) {
      return res.redirect('/logout');
    }
    
    const userDetails = await user.getUserDetails();
    
    // Get counts for dashboard
    const backorderCount = await db.countTableRows('orders');
    const productCount = await db.countTableRows('products');
    const customerCount = await db.countTableRows('customers');
    const supplierCount = await db.countTableRows('suppliers');
    
    // Get backorder data for chart
    const backorderData = {
      '2016': await getBackordersByYear(2016),
      '2017': await getBackordersByYear(2017),
      '2018': await getBackordersByYear(2018)
    };
    
    // Get latest logs
    const logs = await getLatestLogs(5);
    
    // Get latest backorders
    const latestBackorders = await getLatestBackorders(12);
    
    res.render('dashboard/index', {
      title: 'Dashboard',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        group: user.group
      },
      userDetails,
      counts: {
        backorders: backorderCount,
        products: productCount,
        customers: customerCount,
        suppliers: supplierCount
      },
      backorderData,
      logs,
      latestBackorders
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', {
      message: 'Error loading dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Helper function to get backorders by year
async function getBackordersByYear(year) {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        MONTH(date_placed) AS month,
        COUNT(*) AS count 
      FROM 
        orders 
      WHERE 
        YEAR(date_placed) = ?
      GROUP BY 
        MONTH(date_placed)
      ORDER BY
        month
    `, [year]);
    
    // Convert to array of counts by month (1-12)
    const counts = Array(12).fill(0);
    rows.forEach(row => {
      counts[row.month - 1] = row.count;
    });
    
    return counts;
  } catch (error) {
    console.error(`Error getting backorders for ${year}:`, error);
    return Array(12).fill(0);
  }
}

// Helper function to get latest logs
async function getLatestLogs(limit) {
  try {
    // Get distinct dates
    const [dates] = await pool.execute(`
      SELECT DISTINCT DATE(log_date) AS log_date
      FROM log
      ORDER BY log_date DESC
      LIMIT ?
    `, [limit]);
    
    const logs = [];
    const logActions = {
      '1': 'created',
      '2': 'updated',
      '3': 'completed',
      '4': 'canceled',
      '5': 'deleted',
      '6': 'removed'
    };
    
    const logActionIcons = {
      '1': 'fa fa-pencil bg-purple',
      '2': 'fa fa-refresh bg-teal',
      '3': 'fa fa-check bg-green',
      '4': 'fa fa-ban bg-red',
      '5': 'fa fa-trash bg-orange',
      '6': 'fa fa-chain-broken bg-navy'
    };
    
    for (const date of dates) {
      const formattedDate = new Date(date.log_date).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      
      // Get logs for this date
      const [logEntries] = await pool.execute(`
        SELECT 
          users.name,
          log.log_action,
          log.log_details,
          log.log_table
        FROM log
        JOIN users ON log.user_id = users.id
        WHERE DATE(log.log_date) = ?
        ORDER BY log.id DESC
        LIMIT ?
      `, [date.log_date, limit]);
      
      logs.push({
        date: formattedDate,
        entries: logEntries.map(entry => ({
          name: entry.name.split(' ')[0], // First name only
          action: logActions[entry.log_action] || 'unknown',
          actionIcon: logActionIcons[entry.log_action] || 'fa fa-question bg-gray',
          details: entry.log_details,
          table: entry.log_table
        }))
      });
    }
    
    return logs;
  } catch (error) {
    console.error('Error getting latest logs:', error);
    return [];
  }
}

// Helper function to get latest backorders
async function getLatestBackorders(limit) {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        products.item_name,
        orders.quantity,
        customers.customer_name,
        orders.order_status
      FROM orders
      JOIN products ON orders.item_id = products.id
      JOIN customers ON orders.customer_id = customers.id
      WHERE orders.order_completion_status = 0
      ORDER BY orders.id DESC
      LIMIT ?
    `, [limit]);
    
    return rows;
  } catch (error) {
    console.error('Error getting latest backorders:', error);
    return [];
  }
}

module.exports = router;