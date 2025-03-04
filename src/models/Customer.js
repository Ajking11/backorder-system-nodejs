const { pool } = require('../config/database');

class Customer {
  constructor(data = {}) {
    this.id = data.id || null;
    this.customerName = data.customer_name || data.customerName || '';
    this.customerCode = data.customer_code || data.customerCode || '';
    this.contactName = data.contact_name || data.contactName || '';
    this.contactNumber = data.contact_number || data.contactNumber || '';
    this.email = data.email || '';
    this.address = data.address || '';
    this.active = data.active !== undefined ? data.active : 1;
    this.notes = data.notes || '';
  }

  // Find customer by ID
  static async findById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM customers WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      return new Customer(rows[0]);
    } catch (error) {
      console.error('Error finding customer:', error);
      throw error;
    }
  }

  // Find customer by code
  static async findByCode(code) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM customers WHERE customer_code = ?',
        [code]
      );

      if (rows.length === 0) {
        return null;
      }

      return new Customer(rows[0]);
    } catch (error) {
      console.error('Error finding customer by code:', error);
      throw error;
    }
  }

  // Get all customers with optional filters
  static async getAll(options = {}) {
    try {
      let query = 'SELECT * FROM customers WHERE 1=1';
      const params = [];

      // Filter by active status
      if (options.active !== undefined) {
        query += ' AND active = ?';
        params.push(options.active);
      }

      // Search by name, code, or contact
      if (options.search) {
        query += ' AND (customer_name LIKE ? OR customer_code LIKE ? OR contact_name LIKE ?)';
        const searchTerm = `%${options.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Order by
      query += ' ORDER BY ' + (options.orderBy || 'customer_name ASC');

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
      
      return rows.map(row => new Customer(row));
    } catch (error) {
      console.error('Error getting customers:', error);
      throw error;
    }
  }

  // Create a new customer
  static async create(data) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO customers (
          customer_name, 
          customer_code, 
          contact_name, 
          contact_number, 
          email,
          address,
          active,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.customerName,
          data.customerCode,
          data.contactName || '',
          data.contactNumber || '',
          data.email || '',
          data.address || '',
          data.active !== undefined ? data.active : 1,
          data.notes || ''
        ]
      );

      // Log the action
      await this.logAction(1, result.insertId, data);

      return result.insertId;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  // Update a customer
  async update(data) {
    try {
      if (!this.id) {
        throw new Error('Customer ID is not set');
      }

      const [result] = await pool.execute(
        `UPDATE customers SET
          customer_name = ?,
          customer_code = ?,
          contact_name = ?,
          contact_number = ?,
          email = ?,
          address = ?,
          active = ?,
          notes = ?
        WHERE id = ?`,
        [
          data.customerName || this.customerName,
          data.customerCode || this.customerCode,
          data.contactName || this.contactName,
          data.contactNumber || this.contactNumber,
          data.email || this.email,
          data.address || this.address,
          data.active !== undefined ? data.active : this.active,
          data.notes || this.notes,
          this.id
        ]
      );

      // Log the action
      await Customer.logAction(2, this.id, data);

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  // Delete a customer (soft delete by setting active = 0)
  async delete() {
    try {
      if (!this.id) {
        throw new Error('Customer ID is not set');
      }

      const [result] = await pool.execute(
        'UPDATE customers SET active = 0 WHERE id = ?',
        [this.id]
      );

      // Log the action
      await Customer.logAction(5, this.id, { active: 0 });

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  // Get backorders for this customer
  async getBackorders(options = {}) {
    try {
      if (!this.id) {
        throw new Error('Customer ID is not set');
      }

      let query = `
        SELECT 
          o.*,
          p.item_name,
          p.item_code,
          s.supplier_name
        FROM 
          orders o
        JOIN 
          products p ON o.item_id = p.id
        LEFT JOIN 
          suppliers s ON p.supplier_id = s.id
        WHERE 
          o.customer_id = ?
      `;
      
      const params = [this.id];

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

      // Order by
      query += ' ORDER BY ' + (options.orderBy || 'o.date_placed DESC');

      // Limit
      if (options.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(options.limit));
      }

      const [rows] = await pool.execute(query, params);
      
      return rows;
    } catch (error) {
      console.error('Error getting customer backorders:', error);
      throw error;
    }
  }

  // Get customer statistics
  async getStatistics() {
    try {
      if (!this.id) {
        throw new Error('Customer ID is not set');
      }

      // Get backorder counts
      const [backorderCounts] = await pool.execute(`
        SELECT 
          SUM(CASE WHEN order_completion_status = 0 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN order_completion_status = 1 THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN order_completion_status = 2 THEN 1 ELSE 0 END) as cancelled,
          COUNT(*) as total
        FROM 
          orders
        WHERE 
          customer_id = ?
      `, [this.id]);

      // Get status breakdown
      const [statusCounts] = await pool.execute(`
        SELECT 
          order_status,
          COUNT(*) as count
        FROM 
          orders
        WHERE 
          customer_id = ? AND
          order_completion_status = 0
        GROUP BY 
          order_status
      `, [this.id]);

      // Get monthly trend for current year
      const currentYear = new Date().getFullYear();
      const [monthlyCounts] = await pool.execute(`
        SELECT 
          MONTH(date_placed) as month,
          COUNT(*) as count
        FROM 
          orders
        WHERE 
          customer_id = ? AND
          YEAR(date_placed) = ?
        GROUP BY 
          MONTH(date_placed)
        ORDER BY
          month
      `, [this.id, currentYear]);

      return {
        backorders: backorderCounts[0],
        byStatus: statusCounts,
        byMonth: monthlyCounts
      };
    } catch (error) {
      console.error('Error getting customer statistics:', error);
      throw error;
    }
  }

  // Search customers
  static async search(term, limit = 10) {
    try {
      const [rows] = await pool.execute(
        `SELECT * FROM customers
        WHERE 
          active = 1 AND
          (customer_name LIKE ? OR customer_code LIKE ? OR contact_name LIKE ?)
        ORDER BY 
          customer_name
        LIMIT ?`,
        [`%${term}%`, `%${term}%`, `%${term}%`, limit]
      );
      
      return rows.map(row => ({
        id: row.id,
        name: row.customer_name,
        code: row.customer_code,
        contact: row.contact_name,
        phone: row.contact_number
      }));
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error;
    }
  }

  // Log an action
  static async logAction(actionType, customerId, data) {
    try {
      // Get customer details for logging
      const [customerRows] = await pool.execute(
        'SELECT customer_name, customer_code FROM customers WHERE id = ?',
        [customerId]
      );

      if (customerRows.length === 0) {
        return false;
      }

      const customer = customerRows[0];
      
      // Determine action text
      const actions = {
        1: 'created',
        2: 'updated',
        5: 'deleted'
      };

      const actionText = actions[actionType] || 'modified';
      
      // Create log details
      const details = `${customer.customer_name} (${customer.customer_code})`;
      
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
          'customer',
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

module.exports = Customer;