const { pool } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.username = data.username || null;
    this.name = data.name || null;
    this.email = data.email || null;
    this.group = data.group || null;
  }

  // Find user by ID or username
  static async find(user) {
    try {
      let query, params;
      
      if (typeof user === 'number' || /^\d+$/.test(user)) {
        // If user is a number or numeric string, search by ID
        query = 'SELECT * FROM users WHERE id = ?';
        params = [user];
      } else {
        // Otherwise search by username
        query = 'SELECT * FROM users WHERE username = ?';
        params = [user];
      }

      const [rows] = await pool.execute(query, params);
      
      if (rows.length === 0) {
        return null;
      }
      
      return new User(rows[0]);
    } catch (error) {
      console.error('Error finding user:', error);
      throw error;
    }
  }

  // Authenticate user
  static async login(username, password, remember = false) {
    try {
      // Get user by username
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (rows.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const user = rows[0];
      
      // Verify password (using the same approach as the PHP version)
      const hashedPassword = await bcrypt.hash(password, user.salt);
      const passwordMatch = hashedPassword === user.password;

      if (!passwordMatch) {
        return { success: false, message: 'Invalid password' };
      }

      // Create JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '24h' }
      );

      // If remember is true, create a remember token
      let rememberToken = null;
      if (remember) {
        rememberToken = await this.createRememberToken(user.id);
      }

      return {
        success: true,
        user: new User(user),
        token,
        rememberToken
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Create a remember token
  static async createRememberToken(userId) {
    try {
      const token = require('crypto').randomBytes(64).toString('hex');
      const hash = await bcrypt.hash(token, 10);
      
      // Check if user already has a remember token
      const [existingRows] = await pool.execute(
        'SELECT * FROM users_session WHERE user_id = ?',
        [userId]
      );

      if (existingRows.length > 0) {
        // Update existing token
        await pool.execute(
          'UPDATE users_session SET hash = ? WHERE user_id = ?',
          [hash, userId]
        );
      } else {
        // Create new token
        await pool.execute(
          'INSERT INTO users_session (user_id, hash) VALUES (?, ?)',
          [userId, hash]
        );
      }

      return token;
    } catch (error) {
      console.error('Error creating remember token:', error);
      throw error;
    }
  }

  // Verify remember token
  static async verifyRememberToken(token) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users_session WHERE hash = ?',
        [token]
      );

      if (rows.length === 0) {
        return null;
      }

      return await User.find(rows[0].user_id);
    } catch (error) {
      console.error('Error verifying remember token:', error);
      throw error;
    }
  }

  // Get user details
  async getUserDetails() {
    try {
      if (!this.id) {
        throw new Error('User ID is not set');
      }

      const [rows] = await pool.execute(
        'SELECT * FROM users_detail WHERE id = ?',
        [this.id]
      );

      if (rows.length === 0) {
        return null;
      }

      return rows[0];
    } catch (error) {
      console.error('Error getting user details:', error);
      throw error;
    }
  }

  // Check if user has permission
  async hasPermission(key) {
    try {
      if (!this.group) {
        return false;
      }

      const [rows] = await pool.execute(
        'SELECT * FROM groups WHERE id = ?',
        [this.group]
      );

      if (rows.length === 0) {
        return false;
      }

      const permissions = JSON.parse(rows[0].permissions);
      return permissions[key] === true;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  // Create a new user
  static async create(userData) {
    try {
      // Generate salt and hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Insert user into database
      const [result] = await pool.execute(
        'INSERT INTO users (username, password, salt, name, joined, group) VALUES (?, ?, ?, ?, NOW(), ?)',
        [userData.username, hashedPassword, salt, userData.name, userData.group || 1]
      );

      // Create user details
      await pool.execute(
        'INSERT INTO users_detail (id) VALUES (?)',
        [result.insertId]
      );

      // Create user settings
      await pool.execute(
        'INSERT INTO users_settings (id, first_time_login) VALUES (?, 1)',
        [result.insertId]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  async update(fields) {
    try {
      if (!this.id) {
        throw new Error('User ID is not set');
      }

      // Build query dynamically based on fields
      const keys = Object.keys(fields);
      const values = Object.values(fields);
      
      if (keys.length === 0) {
        return false;
      }

      const setClause = keys.map(key => `${key} = ?`).join(', ');
      const query = `UPDATE users SET ${setClause} WHERE id = ?`;
      
      // Add ID to values
      values.push(this.id);

      const [result] = await pool.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Logout user
  async logout() {
    try {
      if (!this.id) {
        return false;
      }

      // Delete remember token
      await pool.execute(
        'DELETE FROM users_session WHERE user_id = ?',
        [this.id]
      );

      return true;
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  }
}

module.exports = User;