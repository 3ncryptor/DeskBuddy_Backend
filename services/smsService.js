const axios = require("axios");
const logger = require("../utils/logger");

class SMSService {
  constructor() {
    this.baseURL = process.env.SMS_BASE_URL || "https://api.example.com"; // Replace with actual SMS API base URL
    this.timeout = 10000; // 10 seconds timeout
  }

  /**
   * Send SMS notification for a specific event
   * @param {string} slug - The SMS template slug (e.g., 'arrival', 'hostel', 'documents')
   * @param {Object} data - Data to send with the SMS request
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendSMS(slug, data) {
    if (!slug) {
      logger.error("SMSService: Slug is required");
      return { success: false, error: "SMS slug is required" };
    }

    try {
      logger.info("SMSService: Sending SMS", {
        slug,
        data: { ...data, phoneNumber: data.phoneNumber ? "***" : undefined },
      });

      const response = await axios.post(
        `${this.baseURL}/api/v1/sms/${slug}`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
            // Add any other required headers here
          },
          timeout: this.timeout,
        }
      );

      const { messageId } = response.data;

      logger.info("SMSService: SMS sent successfully", {
        slug,
        messageId,
        statusCode: response.success,
      });

      return {
        success: true,
        messageId: messageId || "SMS_SENT",
        statusCode: response.status,
      };
    } catch (error) {
      let errorMessage = "Unknown SMS error occurred";

      if (error.response) {
        // Server responded with error status
        errorMessage = `SMS API error: ${error.response.status} - ${error.response.statusText}`;
        logger.error("SMSService: API error", {
          slug,
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        });
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = "SMS API timeout or network error";
        logger.error("SMSService: Network error", {
          slug,
          error: error.message,
        });
      } else {
        // Something else happened
        errorMessage = `SMS API error: ${error.message}`;
        logger.error("SMSService: Unexpected error", {
          slug,
          error: error.message,
        });
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send arrival notification SMS
   * @param {Object} params - Arrival notification parameters
   * @param {string} params.studentId - Student ID
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendArrivalNotification({ studentId }) {
    const data = {
      studentId,
    };

    return this.sendSMS("arrival", data);
  }

  /**
   * Send hostel verification notification SMS
   * @param {Object} params - Hostel notification parameters
   * @param {string} params.studentId - Student ID
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendHostelNotification({ studentId }) {
    const data = {
      studentId,
    };

    return this.sendSMS("hostel", data);
  }

  /**
   * Send documents verification notification SMS
   * @param {Object} params - Documents notification parameters
   * @param {string} params.studentId - Student ID
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendDocumentsNotification({ studentId }) {
    const data = {
      studentId,
    };

    return this.sendSMS("document", data);
  }
}

module.exports = new SMSService();
