const { pool } = require('../config/database');
const Database = require('./Database');

class Backorder {
  constructor(data = {}) {
    this.id = data.id || null;
    this.itemId = data.item_id || data.itemId || null;
    this.customerId = data.customer_id || data.customerId || null;
    this.quantity = data.quantity || 0;
    this.status = data.order_status || data.status || 'Noted';
    this.datePlaced = data.date_placed ? new Date(data.date_placed) : new Date();
    this.completionStatus = data.order_completion_status || data.completionStatus || 0;
    this.notes = data.notes || '';
  }

  // Find backorder by ID
  static async findById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM orders WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      return new Backorder(rows[0]);
    } catch (error) {
      console.error('Error finding backorder:', error);
      throw error;
    }
  }

  // Get all backorders with optional filters
  static async getAll(options = {}) {
    try {
      let query = `
        SELECT 
          o.*,
          p.item_name,
          p.item_code,
          c.customer_name,
          c.customer_code,
          s.supplier_name
        FROM 
          orders o
        JOIN 
          products p ON o.item_id = p.id
        JOIN 
          customers c ON o.customer_id = c.id
        LEFT JOIN
          suppliers s ON p.supplier_id = s.id
        WHERE 1=1
      `;
      
      const params = [];

      // Filter by completion status
      if (options.completionStatus !== undefined) {
        query += ' AND o.order_completion_status = ?';
        params.push(options.completionStatus);
      }

      // Filter by order status
      if (options.status) {
        query += ' AND o.order_status = ?';
        params.push(options.status);
      }

      // Filter by customer
      if (options.customerId) {
        query += ' AND o.customer_id = ?';
        params.push(options.customerId);
      }

      // Filter by item
      if (options.itemId) {
        query += ' AND o.item_id = ?';
        params.push(options.itemId);
      }

      // Filter by date range
      if (options.startDate) {
        query += ' AND o.date_placed >= ?';
        params.push(options.startDate);
      }

      if (options.endDate) {
        query += ' AND o.date_placed <= ?';
        params.push(options.endDate);
      }

      // Order by
      query += ' ORDER BY ' + (options.orderBy || 'o.id DESC');

      // Limit
      if (options.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(options.limit));
        
        if (options.offset) {
          query += ' OFFSET ?';
          params.push(parseInt(options.offset));
        }
      }

      const [rows] = await pool.execute(query, params);
      
      return rows.map(row => ({
        ...row,
        backorder: new Backorder(row)
      }));
    } catch (error) {
      console.error('Error getting backorders:', error);
      throw error;
    }
  }

  // Create a new backorder
  static async create(data) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO orders (
          item_id, 
          customer_id, 
          quantity, 
          order_status, 
          date_placed, 
          order_completion_status,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.itemId,
          data.customerId,
          data.quantity,
          data.status || 'Noted',
          data.datePlaced ? new Date(data.datePlaced) : new Date(),
          data.completionStatus || 0,
          data.notes || ''
        ]
      );

      // Log the action
      await this.logAction(1, result.insertId, data);

      return result.insertId;
    } catch (error) {
      console.error('Error creating backorder:', error);
      throw error;
    }
  }

  // Update a backorder
  async update(data) {
    try {
      if (!this.id) {
        throw new Error('Backorder ID is not set');
      }

      const [result] = await pool.execute(
        `UPDATE orders SET
          item_id = ?,
          customer_id = ?,
          quantity = ?,
          order_status = ?,
          notes = ?
        WHERE id = ?`,
        [
          data.itemId || this.itemId,
          data.customerId || this.customerId,
          data.quantity || this.quantity,
          data.status || this.status,
          data.notes || this.notes,
          this.id
        ]
      );

      // Log the action
      await Backorder.logAction(2, this.id, data);

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating backorder:', error);
      throw error;
    }
  }

  // Complete a backorder
  async complete() {
    try {
      if (!this.id) {
        throw new Error('Backorder ID is not set');
      }

      const [result] = await pool.execute(
        `UPDATE orders SET
          order_completion_status = 1,
          date_completed = NOW()
        WHERE id = ?`,
        [this.id]
      );

      // Log the action
      await Backorder.logAction(3, this.id, { status: 'Completed' });

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error completing backorder:', error);
      throw error;
    }
  }

  // Cancel a backorder
  async cancel() {
    try {
      if (!this.id) {
        throw new Error('Backorder ID is not set');
      }

      const [result] = await pool.execute(
        `UPDATE orders SET
          order_completion_status = 2,
          date_completed = NOW()
        WHERE id = ?`,
        [this.id]
      );

      // Log the action
      await Backorder.logAction(4, this.id, { status: 'Cancelled' });

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error cancelling backorder:', error);
      throw error;
    }
  }

  // Delete a backorder
  async delete() {
    try {
      if (!this.id) {
        throw new Error('Backorder ID is not set');
      }

      const [result] = await pool.execute(
        'DELETE FROM orders WHERE id = ?',
        [this.id]
      );

      // Log the action
      await Backorder.logAction(5, this.id, { status: 'Deleted' });

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting backorder:', error);
      throw error;
    }
  }

  // Get backorder details with related data
  async getDetails() {
    try {
      if (!this.id) {
        throw new Error('Backorder ID is not set');
      }

      const [rows] = await pool.execute(
        `SELECT 
          o.*,
          p.item_name,
          p.item_code,
          c.customer_name,
          c.customer_code,
          s.supplier_name
        FROM 
          orders o
        JOIN 
          products p ON o.item_id = p.id
        JOIN 
          customers c ON o.customer_id = c.id
        LEFT JOIN
          suppliers s ON p.supplier_id = s.id
        WHERE 
          o.id = ?`,
        [this.id]
      );

      if (rows.length === 0) {
        return null;
      }

      return {
        ...rows[0],
        backorder: this
      };
    } catch (error) {
      console.error('Error getting backorder details:', error);
      throw error;
    }
  }

  // Get backorder statistics
  static async getStatistics() {
    try {
      // Get counts by status
      const [statusCounts] = await pool.execute(`
        SELECT 
          order_status,
          COUNT(*) as count
        FROM 
          orders
        WHERE 
          order_completion_status = 0
        GROUP BY 
          order_status
      `);

      // Get counts by month for current year
      const currentYear = new Date().getFullYear();
      const [monthlyCounts] = await pool.execute(`
        SELECT 
          MONTH(date_placed) as month,
          COUNT(*) as count
        FROM 
          orders
        WHERE 
          YEAR(date_placed) = ?
        GROUP BY 
          MONTH(date_placed)
        ORDER BY
          month
      `, [currentYear]);

      // Get total counts
      const [totalCounts] = await pool.execute(`
        SELECT 
          SUM(CASE WHEN order_completion_status = 0 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN order_completion_status = 1 THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN order_completion_status = 2 THEN 1 ELSE 0 END) as cancelled,
          COUNT(*) as total
        FROM 
          orders
      `);

      return {
        byStatus: statusCounts,
        byMonth: monthlyCounts,
        totals: totalCounts[0]
      };
    } catch (error) {
      console.error('Error getting backorder statistics:', error);
      throw error;
    }
  }

  // Log an action
  static async logAction(actionType, backorderId, data) {
    try {
      // Get backorder details for logging
      const [backorderRows] = await pool.execute(
        `SELECT 
          o.id,
          p.item_name,
          c.customer_name
        FROM 
          orders o
        JOIN 
          products p ON o.item_id = p.id
        JOIN 
          customers c ON o.customer_id = c.id
        WHERE 
          o.id = ?`,
        [backorderId]
      );

      if (backorderRows.length === 0) {
        return false;
      }

      const backorder = backorderRows[0];
      
      // Determine action text
      const actions = {
        1: 'created',
        2: 'updated',
        3: 'completed',
        4: 'canceled',
        5: 'deleted',
        6: 'removed'
      };

      const actionText = actions[actionType] || 'modified';
      
      // Create log details
      const details = `${backorder.item_name} for ${backorder.customer_name}`;
      
      // Get user ID from session (this will need to be passed in from the controller)
      const userId = data.userId || 1; // Default to user ID 1 if not provided
      
      // Insert log entry
      await pool.execute(
        `INSERT INTO log (
          user_id,
          log_action,
          log_table,
          log_details,
          log_date
        ) VALUES (?, ?, ?, ?, NOW())`,
        [
          userId,
          actionType,
          'backorder',
          details
        ]
      );

      return true;
    } catch (error) {
      console.error('Error logging action:', error);
      return false;
    }
  }
}

module.exports = Backorder;