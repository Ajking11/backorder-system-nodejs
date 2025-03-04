# Backorder System (Node.js)

A Node.js version of the backorder management system, modernized from the original PHP application.

## Features

- User authentication with session and remember-me functionality
- Dashboard with statistics and charts
- Backorder management
- Customer, product, and supplier databases
- User management with role-based access control
- Activity logging

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Template Engine**: EJS
- **Authentication**: JWT, bcrypt
- **Frontend**: Bootstrap, AdminLTE, Chart.js

## Getting Started

### Prerequisites

- Node.js (v14+)
- MySQL

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/Ajking11/backorder-system-nodejs.git
   cd backorder-system-nodejs
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   # Database Configuration
   DB_HOST=127.0.0.1
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=backorderbook

   # JWT Secret for Authentication
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRY=86400000

   # Session Configuration
   SESSION_SECRET=your_session_secret_here
   COOKIE_NAME=backorder_session
   COOKIE_EXPIRY=31104000

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. Start the application:
   ```
   npm start
   ```

   For development with auto-reload:
   ```
   npm run dev
   ```

5. Access the application at `http://localhost:3000`

## Project Structure

```
backorder-system-nodejs/
├── public/                  # Static assets
│   ├── css/                 # CSS files
│   ├── js/                  # JavaScript files
│   └── images/              # Image files
├── src/                     # Application source code
│   ├── config/              # Configuration files
│   ├── controllers/         # Route controllers
│   ├── middleware/          # Express middleware
│   ├── models/              # Data models
│   ├── routes/              # Express routes
│   ├── services/            # Business logic
│   ├── utils/               # Utility functions
│   ├── views/               # EJS templates
│   └── app.js               # Application entry point
├── .env                     # Environment variables
├── .gitignore               # Git ignore file
├── package.json             # NPM package configuration
└── README.md                # Project documentation
```

## License

This project is licensed under the ISC License.

## Acknowledgements

This project is a modernized version of the original PHP backorder management system.