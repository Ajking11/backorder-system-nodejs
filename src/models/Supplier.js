const { pool } = require('../config/database');

class Supplier {
  constructor(data = {}) {
    this.id = data.id || null;
    this.supplierName = data.supplier_name || data.supplierName || '';
    this.supplierCode = data.supplier_code || data.supplierCode || '';
    this.contactName = data.contact_name || data.contactName || '';
    this.contactNumber = data.contact_number || data.contactNumber || '';
    this.email = data.email || '';
    this.address = data.address || '';
    this.active = data.active !== undefined ? data.active : 1;
    this.notes = data.notes || '';
  }

  // Find supplier by ID
  static async findById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM suppliers WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      return new Supplier(rows[0]);
    } catch (error) {
      console.error('Error finding supplier:', error);
      throw error;
    }
  }

  // Find supplier by code
  static async findByCode(code) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM suppliers WHERE supplier_code = ?',
        [code]
      );

      if (rows.length === 0) {
        return null;
      }

      return new Supplier(rows[0]);
    } catch (error) {
      console.error('Error finding supplier by code:', error);
      throw error;
    }
  }

  // Get all suppliers with optional filters
  static async getAll(options = {}) {
    try {
      let query = 'SELECT * FROM suppliers WHERE 1=1';
      const params = [];

      // Filter by active status
      if (options.active !== undefined) {
        query += ' AND active = ?';
        params.push(options.active);
      }

      // Search by name, code, or contact
      if (options.search) {
        query += ' AND (supplier_name LIKE ? OR supplier_code LIKE ? OR contact_name LIKE ?)';
        const searchTerm = `%${options.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Order by
      query += ' ORDER BY ' + (options.orderBy || 'supplier_name ASC');

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
      
      return rows.map(row => new Supplier(row));
    } catch (error) {
      console.error('Error getting suppliers:', error);
      throw error;
    }
  }

  // Create a new supplier
  static async create(data) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO suppliers (
          supplier_name, 
          supplier_code, 
          contact_name, 
          contact_number, 
          email,
          address,
          active,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.supplierName,
          data.supplierCode,
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
      console.error('Error creating supplier:', error);
      throw error;
    }
  }

  // Update a supplier
  async update(data) {
    try {
      if (!this.id) {
        throw new Error('Supplier ID is not set');
      }

      const [result] = await pool.execute(
        `UPDATE suppliers SET
          supplier_name = ?,
          supplier_code = ?,
          contact_name = ?,
          contact_number = ?,
          email = ?,
          address = ?,
          active = ?,
          notes = ?
        WHERE id = ?`,
        [
          data.supplierName || this.supplierName,
          data.supplierCode || this.supplierCode,
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
      await Supplier.logAction(2, this.id, data);

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  }

  // Delete a supplier (soft delete by setting active = 0)
  async delete() {
    try {
      if (!this.id) {
        throw new Error('Supplier ID is not set');
      }

      const [result] = await pool.execute(
        'UPDATE suppliers SET active = 0 WHERE id = ?',
        [this.id]
      );

      // Log the action
      await Supplier.logAction(5, this.id, { active: 0 });

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  }

  // Get products from this supplier
  async getProducts(options = {}) {
    try {
      if (!this.id) {
        throw new Error('Supplier ID is not set');
      }

      let query = 'SELECT * FROM products WHERE supplier_id = ?';
      const params = [this.id];

      // Filter by active status
      if (options.active !== undefined) {
        query += ' AND active = ?';
        params.push(options.active);
      }

      // Search by name or code
      if (options.search) {
        query += ' AND (item_name LIKE ? OR item_code LIKE ?)';
        const searchTerm = `%${options.search}%`;
        params.push(searchTerm, searchTerm);
      }

      // Order by
      query += ' ORDER BY ' + (options.orderBy || 'item_name ASC');

      // Limit
      if (options.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(options.limit));
      }

      const [rows] = await pool.execute(query, params);
      
      return rows;
    } catch (error) {
      console.error('Error getting supplier products:', error);
      throw error;
    }
  }

  // Get backorders related to this supplier
  async getBackorders(options = {}) {
    try {
      if (!this.id) {
        throw new Error('Supplier ID is not set');
      }

      let query = `
        SELECT 
          o.*,
          p.item_name,
          p.item_code,
          c.customer_name,
          c.customer_code
        FROM 
          orders o
        JOIN 
          products p ON o.item_id = p.id
        JOIN 
          customers c ON o.customer_id = c.id
        WHERE 
          p.supplier_id = ?
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
      console.error('Error getting supplier backorders:', error);
      throw error;
    }
  }

  // Get supplier statistics
  async getStatistics() {
    try {
      if (!this.id) {
        throw new Error('Supplier ID is not set');
      }

      // Get product count
      const [productCount] = await pool.execute(`
        SELECT COUNT(*) as count
        FROM products
        WHERE supplier_id = ? AND active = 1
      `, [this.id]);

      // Get backorder counts
      const [backorderCounts] = await pool.execute(`
        SELECT 
          SUM(CASE WHEN o.order_completion_status = 0 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN o.order_completion_status = 1 THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN o.order_completion_status = 2 THEN 1 ELSE 0 END) as cancelled,
          COUNT(*) as total
        FROM 
          orders o
        JOIN
          products p ON o.item_id = p.id
        WHERE 
          p.supplier_id = ?
      `, [this.id]);

      // Get status breakdown
      const [statusCounts] = await pool.execute(`
        SELECT 
          o.order_status,
          COUNT(*) as count
        FROM 
          orders o
        JOIN
          products p ON o.item_id = p.id
        WHERE 
          p.supplier_id = ? AND
          o.order_completion_status = 0
        GROUP BY 
          o.order_status
      `, [this.id]);

      return {
        products: productCount[0].count,
        backorders: backorderCounts[0],
        byStatus: statusCounts
      };
    } catch (error) {
      console.error('Error getting supplier statistics:', error);
      throw error;
    }
  }

  // Search suppliers
  static async search(term, limit = 10) {
    try {
      const [rows] = await pool.execute(
        `SELECT * FROM suppliers
        WHERE 
          active = 1 AND
          (supplier_name LIKE ? OR supplier_code LIKE ? OR contact_name LIKE ?)
        ORDER BY 
          supplier_name
        LIMIT ?`,
        [`%${term}%`, `%${term}%`, `%${term}%`, limit]
      );
      
      return rows.map(row => ({
        id: row.id,
        name: row.supplier_name,
        code: row.supplier_code,
        contact: row.contact_name,
        phone: row.contact_number
      }));
    } catch (error) {
      console.error('Error searching suppliers:', error);
      throw error;
    }
  }

  // Log an action
  static async logAction(actionType, supplierId, data) {
    try {
      // Get supplier details for logging
      const [supplierRows] = await pool.execute(
        'SELECT supplier_name, supplier_code FROM suppliers WHERE id = ?',
        [supplierId]
      );

      if (supplierRows.length === 0) {
        return false;
      }

      const supplier = supplierRows[0];
      
      // Determine action text
      const actions = {
        1: 'created',
        2: 'updated',
        5: 'deleted'
      };

      const actionText = actions[actionType] || 'modified';
      
      // Create log details
      const details = `${supplier.supplier_name} (${supplier.supplier_code})`;
      
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
          'supplier',
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

module.exports = Supplier;