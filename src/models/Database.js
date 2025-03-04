const { pool } = require('../config/database');

class Database {
  // Singleton instance
  static #instance = null;

  constructor() {
    if (Database.#instance) {
      return Database.#instance;
    }
    Database.#instance = this;
  }

  // Get singleton instance
  static getInstance() {
    if (!Database.#instance) {
      Database.#instance = new Database();
    }
    return Database.#instance;
  }

  // Execute a query with parameters
  async query(sql, params = []) {
    try {
      const [results] = await pool.execute(sql, params);
      return {
        results,
        count: results.length,
        error: false
      };
    } catch (error) {
      console.error('Database query error:', error);
      return {
        results: [],
        count: 0,
        error: true,
        errorMessage: error.message
      };
    }
  }

  // Get records from a table with conditions
  async get(table, where) {
    try {
      if (!Array.isArray(where) || where.length !== 3) {
        throw new Error('Where clause must be an array with 3 elements: [field, operator, value]');
      }

      const [field, operator, value] = where;
      const validOperators = ['=', '>', '<', '>=', '<='];

      if (!validOperators.includes(operator)) {
        throw new Error(`Invalid operator: ${operator}. Valid operators are: ${validOperators.join(', ')}`);
      }

      const sql = `SELECT * FROM ${table} WHERE ${field} ${operator} ?`;
      return await this.query(sql, [value]);
    } catch (error) {
      console.error('Database get error:', error);
      return {
        results: [],
        count: 0,
        error: true,
        errorMessage: error.message
      };
    }
  }

  // Insert a record into a table
  async insert(table, fields = {}) {
    try {
      const keys = Object.keys(fields);
      const values = Object.values(fields);
      
      if (keys.length === 0) {
        throw new Error('No fields provided for insert');
      }

      const placeholders = Array(keys.length).fill('?').join(', ');
      const sql = `INSERT INTO ${table} (\`${keys.join('`, `')}\`) VALUES (${placeholders})`;
      
      const result = await pool.execute(sql, values);
      return {
        success: true,
        insertId: result[0].insertId,
        affectedRows: result[0].affectedRows
      };
    } catch (error) {
      console.error('Database insert error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update a record in a table
  async update(table, id, fields = {}) {
    try {
      const keys = Object.keys(fields);
      const values = Object.values(fields);
      
      if (keys.length === 0) {
        throw new Error('No fields provided for update');
      }

      const setClause = keys.map(key => `${key} = ?`).join(', ');
      const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
      
      // Add ID to values
      values.push(id);

      const result = await pool.execute(sql, values);
      return {
        success: true,
        affectedRows: result[0].affectedRows
      };
    } catch (error) {
      console.error('Database update error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete a record from a table
  async delete(table, where) {
    try {
      if (!Array.isArray(where) || where.length !== 3) {
        throw new Error('Where clause must be an array with 3 elements: [field, operator, value]');
      }

      const [field, operator, value] = where;
      const validOperators = ['=', '>', '<', '>=', '<='];

      if (!validOperators.includes(operator)) {
        throw new Error(`Invalid operator: ${operator}. Valid operators are: ${validOperators.join(', ')}`);
      }

      const sql = `DELETE FROM ${table} WHERE ${field} ${operator} ?`;
      const result = await pool.execute(sql, [value]);
      
      return {
        success: true,
        affectedRows: result[0].affectedRows
      };
    } catch (error) {
      console.error('Database delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Count rows in a table
  async countTableRows(table) {
    try {
      let sql;
      
      if (table === 'orders') {
        sql = `SELECT COUNT(*) as count FROM ${table} WHERE order_completion_status = 0`;
      } else {
        sql = `SELECT COUNT(*) as count FROM ${table} WHERE active = 1`;
      }
      
      const [rows] = await pool.execute(sql);
      return rows[0].count;
    } catch (error) {
      console.error('Database count error:', error);
      throw error;
    }
  }

  // Get distinct records from a table
  async getDistinct(table, where) {
    try {
      if (!Array.isArray(where) || where.length !== 3) {
        throw new Error('Where clause must be an array with 3 elements: [field, operator, value]');
      }

      const [field, operator, value] = where;
      const validOperators = ['=', '>', '<', '>=', '<='];

      if (!validOperators.includes(operator)) {
        throw new Error(`Invalid operator: ${operator}. Valid operators are: ${validOperators.join(', ')}`);
      }

      const sql = `SELECT DISTINCT * FROM ${table} WHERE ${field} ${operator} ?`;
      return await this.query(sql, [value]);
    } catch (error) {
      console.error('Database getDistinct error:', error);
      return {
        results: [],
        count: 0,
        error: true,
        errorMessage: error.message
      };
    }
  }

  // Get first result from a query
  first(queryResult) {
    if (queryResult && queryResult.results && queryResult.results.length > 0) {
      return queryResult.results[0];
    }
    return null;
  }
}

module.exports = Database;