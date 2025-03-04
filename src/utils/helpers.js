/**
 * Format date to a readable string
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string (default: 'YYYY-MM-DD')
 * @returns {string} Formatted date string
 */
exports.formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency symbol (default: '£')
 * @returns {string} Formatted currency string
 */
exports.formatCurrency = (amount, currency = '£') => {
  if (amount === null || amount === undefined) return '';
  
  return `${currency}${parseFloat(amount).toFixed(2)}`;
};

/**
 * Truncate text to a specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add if truncated (default: '...')
 * @returns {string} Truncated text
 */
exports.truncateText = (text, length, suffix = '...') => {
  if (!text) return '';
  
  if (text.length <= length) return text;
  
  return text.substring(0, length) + suffix;
};

/**
 * Generate pagination links
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {string} baseUrl - Base URL for pagination links
 * @param {Object} queryParams - Query parameters to include in links
 * @returns {Object} Pagination data
 */
exports.generatePagination = (currentPage, totalPages, baseUrl, queryParams = {}) => {
  const pages = [];
  const maxPagesToShow = 5;
  
  // Build query string
  const queryString = Object.entries(queryParams)
    .filter(([key, value]) => value && key !== 'page')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  const urlPrefix = `${baseUrl}?${queryString}${queryString ? '&' : ''}page=`;
  
  // Calculate range of pages to show
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  
  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }
  
  // Generate page links
  for (let i = startPage; i <= endPage; i++) {
    pages.push({
      number: i,
      url: `${urlPrefix}${i}`,
      active: i === currentPage
    });
  }
  
  return {
    pages,
    prevUrl: currentPage > 1 ? `${urlPrefix}${currentPage - 1}` : null,
    nextUrl: currentPage < totalPages ? `${urlPrefix}${currentPage + 1}` : null,
    firstUrl: currentPage > 1 ? `${urlPrefix}1` : null,
    lastUrl: currentPage < totalPages ? `${urlPrefix}${totalPages}` : null
  };
};

/**
 * Generate a random string
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
exports.generateRandomString = (length = 10) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
};

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - HTML to sanitize
 * @returns {string} Sanitized HTML
 */
exports.sanitizeHtml = (html) => {
  if (!html) return '';
  
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 * @param {number} n - Number
 * @returns {string} Ordinal suffix
 */
exports.getOrdinalSuffix = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Format a phone number
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
exports.formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 11) {
    // UK format: 07123 456789
    return cleaned.replace(/(\d{5})(\d{6})/, '$1 $2');
  } else if (cleaned.length === 10) {
    // UK landline: 0123 456789
    return cleaned.replace(/(\d{4})(\d{6})/, '$1 $2');
  }
  
  return phone;
};

/**
 * Check if a string is a valid email
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
exports.isValidEmail = (email) => {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Convert a string to title case
 * @param {string} str - String to convert
 * @returns {string} Title case string
 */
exports.toTitleCase = (str) => {
  if (!str) return '';
  
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};