const { pool } = require('../config/database');

class Product {
  constructor(data = {}) {
    this.id = data.id || null;
    this.itemName = data.item_name || data.itemName || '';
    this.itemCode = data.item_code || data.itemCode || '';
    this.supplierId = data.supplier_id || data.supplierId || null;
    this.price = data.price || 0;
    this.active = data.active !== undefined ? data.active : 1;
    this.description = data.description || '';
    this.category = data.category || '';
  }

  // Find product by ID
  static async findById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM products WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      return new Product(rows[0]);
    } catch (error) {
      console.error('Error finding product:', error);
      throw error;
    }
  }

  // Find product by item code
  static async findByCode(code) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM products WHERE item_code = ?',
        [code]
      );

      if (rows.length === 0) {
        return null;
      }

      return new Product(rows[0]);
    } catch (error) {
      console.error('Error finding product by code:', error);
      throw error;
    }
  }

  // Get all products with optional filters
  static async getAll(options = {}) {
    try {
      let query = `
        SELECT 
          p.*,
          s.supplier_name
        FROM 
          products p
        LEFT JOIN 
          suppliers s ON p.supplier_id = s.id
        WHERE 1=1
      `;
      
      const params = [];

      // Filter by active status
      if (options.active !== undefined) {
        query += ' AND p.active = ?';
        params.push(options.active);
      }

      // Filter by supplier
      if (options.supplierId) {
        query += ' AND p.supplier_id = ?';
        params.push(options.supplierId);
      }

      // Filter by category
      if (options.category) {
        query += ' AND p.category = ?';
        params.push(options.category);
      }

      // Search by name or code
      if (options.search) {
        query += ' AND (p.item_name LIKE ? OR p.item_code LIKE ?)';
        const searchTerm = `%${options.search}%`;
        params.push(searchTerm, searchTerm);
      }

      // Order by
      query += ' ORDER BY ' + (options.orderBy || 'p.item_name ASC');

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
        product: new Product(row)
      }));
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  }

  // Create a new product
  static async create(data) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO products (
          item_name, 
          item_code, 
          supplier_id, 
          price, 
          active,
          description,
          category
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.itemName,
          data.itemCode,
          data.supplierId,
          data.price || 0,
          data.active !== undefined ? data.active : 1,
          data.description || '',
          data.category || ''
        ]
      );

      // Log the action
      await this.logAction(1, result.insertId, data);

      return result.insertId;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  // Update a product
  async update(data) {
    try {
      if (!this.id) {
        throw new Error('Product ID is not set');
      }

      const [result] = await pool.execute(
        `UPDATE products SET
          item_name = ?,
          item_code = ?,
          supplier_id = ?,
          price = ?,
          active = ?,
          description = ?,
          category = ?
        WHERE id = ?`,
        [
          data.itemName || this.itemName,
          data.itemCode || this.itemCode,
          data.supplierId || this.supplierId,
          data.price !== undefined ? data.price : this.price,
          data.active !== undefined ? data.active : this.active,
          data.description || this.description,
          data.category || this.category,
          this.id
        ]
      );

      // Log the action
      await Product.logAction(2, this.id, data);

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  // Delete a product (soft delete by setting active = 0)
  async delete() {
    try {
      if (!this.id) {
        throw new Error('Product ID is not set');
      }

      const [result] = await pool.execute(
        'UPDATE products SET active = 0 WHERE id = ?',
        [this.id]
      );

      // Log the action
      await Product.logAction(5, this.id, { active: 0 });

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Get product details with supplier information
  async getDetails() {
    try {
      if (!this.id) {
        throw new Error('Product ID is not set');
      }

      const [rows] = await pool.execute(
        `SELECT 
          p.*,
          s.supplier_name,
          s.supplier_code,
          s.contact_name,
          s.contact_number
        FROM 
          products p
        LEFT JOIN 
          suppliers s ON p.supplier_id = s.id
        WHERE 
          p.id = ?`,
        [this.id]
      );

      if (rows.length === 0) {
        return null;
      }

      return {
        ...rows[0],
        product: this
      };
    } catch (error) {
      console.error('Error getting product details:', error);
      throw error;
    }
  }

  // Get backorders for this product
  async getBackorders(options = {}) {
    try {
      if (!this.id) {
        throw new Error('Product ID is not set');
      }

      let query = `
        SELECT 
          o.*,
          c.customer_name,
          c.customer_code
        FROM 
          orders o
        JOIN 
          customers c ON o.customer_id = c.id
        WHERE 
          o.item_id = ?
      `;
      
      const params = [this.id];

      // Filter by completion status
      if (options.completionStatus !== undefined) {
        query += ' AND o.order_completion_status = ?';
        params.push(options.completionStatus);
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
      console.error('Error getting product backorders:', error);
      throw error;
    }
  }

  // Get product categories
  static async getCategories() {
    try {
      const [rows] = await pool.execute(
        'SELECT DISTINCT category FROM products WHERE category != "" ORDER BY category'
      );
      
      return rows.map(row => row.category);
    } catch (error) {
      console.error('Error getting product categories:', error);
      throw error;
    }
  }

  // Search products
  static async search(term, limit = 10) {
    try {
      const [rows] = await pool.execute(
        `SELECT 
          p.*,
          s.supplier_name
        FROM 
          products p
        LEFT JOIN 
          suppliers s ON p.supplier_id = s.id
        WHERE 
          p.active = 1 AND
          (p.item_name LIKE ? OR p.item_code LIKE ?)
        ORDER BY 
          p.item_name
        LIMIT ?`,
        [`%${term}%`, `%${term}%`, limit]
      );
      
      return rows.map(row => ({
        id: row.id,
        name: row.item_name,
        code: row.item_code,
        supplier: row.supplier_name,
        price: row.price
      }));
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  // Log an action
  static async logAction(actionType, productId, data) {
    try {
      // Get product details for logging
      const [productRows] = await pool.execute(
        'SELECT item_name, item_code FROM products WHERE id = ?',
        [productId]
      );

      if (productRows.length === 0) {
        return false;
      }

      const product = productRows[0];
      
      // Determine action text
      const actions = {
        1: 'created',
        2: 'updated',
        5: 'deleted'
      };

      const actionText = actions[actionType] || 'modified';
      
      // Create log details
      const details = `${product.item_name} (${product.item_code})`;
      
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
          'product',
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

module.exports = Product;