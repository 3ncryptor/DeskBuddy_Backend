require('dotenv').config();
const axios = require('axios');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    this.baseURL = 'https://rishiverse-api.rishihood.edu.in/api/v1/payment';
    this.apiKey = process.env.EXTERNAL_API_KEY;
  }

  /**
   * Fetch payment data for a student
   * @param {string} studentId - The student ID
   * @returns {Promise<{dueAmount: number|null, success: boolean, error?: string}>}
   */
  async getPaymentData(studentId) {
    if (!studentId) {
      logger.error('PaymentService: Student ID is required');
      return { dueAmount: null, success: false, error: 'Student ID is required' };
    }

    if (!this.apiKey) {
      logger.error('PaymentService: EXTERNAL_API_KEY not configured');
      return { dueAmount: null, success: false, error: 'Payment API not configured' };
    }

    try {
      logger.info('PaymentService: Fetching payment data', { studentId });
      
      const response = await axios.get(`${this.baseURL}/get-data/${studentId}`, {
        headers: {
          'x-api-secret': this.apiKey,
        },
        timeout: 10000, // 10 second timeout
      });

      const { dueAmount } = response.data;
      
      logger.info('PaymentService: Payment data fetched successfully', { 
        studentId, 
        dueAmount 
      });

      return {
        dueAmount: dueAmount ?? null,
        success: true
      };

    } catch (error) {
      let errorMessage = 'Unknown error occurred';
      
      if (error.response) {
        // Server responded with error status
        errorMessage = `Payment API error: ${error.response.status} - ${error.response.statusText}`;
        logger.error('PaymentService: API error', {
          studentId,
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Payment API timeout or network error';
        logger.error('PaymentService: Network error', {
          studentId,
          error: error.message
        });
      } else {
        // Something else happened
        errorMessage = `Payment API error: ${error.message}`;
        logger.error('PaymentService: Unexpected error', {
          studentId,
          error: error.message
        });
      }

      return {
        dueAmount: null,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Check if payment is due (dueAmount > 0)
   * @param {string} studentId - The student ID
   * @returns {Promise<{hasDueAmount: boolean, dueAmount: number|null, success: boolean, error?: string}>}
   */
  async hasPaymentDue(studentId) {
    const result = await this.getPaymentData(studentId);
    
    if (!result.success) {
      return {
        hasDueAmount: false,
        dueAmount: null,
        success: false,
        error: result.error
      };
    }

    const hasDueAmount = result.dueAmount > 0;
    
    return {
      hasDueAmount,
      dueAmount: result.dueAmount,
      success: true
    };
  }
}

module.exports = new PaymentService(); 