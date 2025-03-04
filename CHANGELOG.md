# Changelog

All notable changes to the Backorder System Node.js project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup with Express.js framework
- Database configuration with MySQL connection pool
- User authentication system with session and JWT support
- Dashboard with statistics and charts
- Backorder management functionality
  - List, create, view, edit, complete, and delete backorders
  - Filter backorders by status, customer, and supplier
- Product management functionality
  - List, create, view, edit, and delete products
  - Filter products by supplier, category, and search term
- Customer management functionality
  - List, create, view, edit, and delete customers
  - Search customers by name, code, or contact
- Supplier model for managing suppliers
- Utility functions for common operations
- EJS templates for views
- Error handling middleware
- Authentication middleware for route protection

### Changed
- Modernized the codebase from the original PHP implementation
- Improved database queries with prepared statements
- Enhanced security with proper password hashing and JWT
- Restructured the application using MVC pattern

## Migration from PHP to Node.js

This project is a complete rewrite of the original PHP backorder management system. The migration includes:

1. **Architecture Changes**
   - Moved from custom PHP classes to Node.js with Express
   - Implemented proper MVC architecture
   - Added middleware for authentication and error handling

2. **Database Interaction**
   - Replaced custom DB class with MySQL2 connection pool
   - Implemented models with proper data validation
   - Added transaction support for critical operations

3. **Authentication**
   - Replaced custom session handling with Express session
   - Added JWT support for API authentication
   - Improved password security with bcrypt

4. **Frontend**
   - Kept AdminLTE theme for UI consistency
   - Updated JavaScript to use modern ES6+ syntax
   - Improved AJAX interactions with fetch API

5. **Security Improvements**
   - Removed hardcoded credentials in favor of environment variables
   - Implemented CSRF protection
   - Added input validation and sanitization
   - Proper error handling and logging

## [1.0.0] - TBD

- Initial release of the Node.js version