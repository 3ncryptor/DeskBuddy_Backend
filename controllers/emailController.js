const emailService = require('../services/emailService');
const csvParser = require('../services/csvParser');
const logger = require('../utils/logger');

// Upload CSV and send emails
const uploadCSVAndSendEmails = async (req, res) => {
  let uploadedFilePath = null;
  
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file uploaded'
      });
    }
    
    // Validate file type
    if (!req.file.originalname.toLowerCase().endsWith('.csv')) {
      return res.status(400).json({
        success: false,
        error: 'Only CSV files are allowed'
      });
    }
    
    logger.info("CSV file uploaded", {
      originalName: req.file.originalname,
      size: req.file.size
    });
    
    // Save uploaded file
    uploadedFilePath = csvParser.saveUploadedFile(req.file);
    
    // Parse CSV
    const parseResult = csvParser.parseCSV(uploadedFilePath);
    
    // Check for parsing errors
    if (parseResult.errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV parsing errors found',
        details: {
          summary: parseResult.summary,
          errors: parseResult.errors.slice(0, 10) // Limit to first 10 errors
        }
      });
    }
    
    // Check if we have valid students
    if (parseResult.students.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid student records found in CSV'
      });
    }
    
    logger.info("CSV parsed successfully", {
      validStudents: parseResult.students.length
    });
    
    // Send emails
    const emailResult = await emailService.sendBulkEmails(parseResult.students);
    
    // Clean up uploaded file
    csvParser.cleanupFile(uploadedFilePath);
    uploadedFilePath = null;
    
    // Return results
    res.json({
      success: true,
      message: 'Email sending completed',
      summary: {
        csvSummary: parseResult.summary,
        emailSummary: {
          total: emailResult.total,
          successful: emailResult.successful,
          failed: emailResult.failed
        }
      },
      details: {
        successfulEmails: emailResult.results.filter(r => r.success),
        failedEmails: emailResult.results.filter(r => !r.success)
      }
    });
    
  } catch (error) {
    logger.error("CSV upload and email sending failed", { error: error.message });
    
    // Clean up uploaded file if it exists
    if (uploadedFilePath) {
      csvParser.cleanupFile(uploadedFilePath);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process CSV and send emails',
      details: error.message
    });
  }
};

// Generate QR code for a single student (for testing)
const generateQRCode = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID is required'
      });
    }
    
    const qrCodeDataUrl = await emailService.generateQRCode(studentId);
    
    res.json({
      success: true,
      studentId,
      qrCodeDataUrl
    });
    
  } catch (error) {
    logger.error("QR code generation failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code',
      details: error.message
    });
  }
};

// Download QR code as PNG image
const downloadQRCode = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID is required'
      });
    }
    
    const qrCodeBuffer = await emailService.generateQRCodeBuffer(studentId);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="QR_${studentId}.png"`);
    res.setHeader('Content-Length', qrCodeBuffer.length);
    
    // Send the buffer
    res.send(qrCodeBuffer);
    
  } catch (error) {
    logger.error("QR code download failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code for download',
      details: error.message
    });
  }
};

// Test email sending for a single student
const testEmail = async (req, res) => {
  try {
    const { name, email, studentId } = req.body;
    
    // Validate required fields
    if (!name || !email || !studentId) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and studentId are required'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
    
    logger.info("Testing email sending", { name, email, studentId });
    
    // Send test email
    const result = await emailService.sendBulkEmails([{ name, email, studentId }]);
    
    if (result.failed > 0) {
      return res.status(500).json({
        success: false,
        error: 'Test email failed',
        details: result.results[0].error
      });
    }
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      details: result.results[0]
    });
    
  } catch (error) {
    logger.error("Test email failed", { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      details: error.message
    });
  }
};

// Get email sending status and statistics
const getEmailStats = async (req, res) => {
  try {
    // This would typically query a database for email sending history
    // For now, return a placeholder response
    res.json({
      success: true,
      stats: {
        totalEmailsSent: 0,
        successfulEmails: 0,
        failedEmails: 0,
        lastSentDate: null
      },
      message: 'Email statistics endpoint - implement database integration for actual stats'
    });
    
  } catch (error) {
    logger.error("Failed to get email stats", { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get email statistics',
      details: error.message
    });
  }
};

module.exports = {
  uploadCSVAndSendEmails,
  generateQRCode,
  downloadQRCode,
  testEmail,
  getEmailStats
}; 