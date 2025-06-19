const express = require("express");
const multer = require("multer");
const emailController = require("../controllers/emailController");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow CSV files
    if (
      file.mimetype === "text/csv" ||
      file.originalname.toLowerCase().endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"), false);
    }
  },
});

// Upload CSV and send bulk emails
router.post(
  "/upload-csv",
  upload.single("csvFile"),
  emailController.uploadCSVAndSendEmails
);

// Generate QR code for a student (returns data URL)
router.get("/qr-code/:studentId", emailController.generateQRCode);

// Download QR code as PNG image
router.get("/qr-download/:studentId", emailController.downloadQRCode);

// Send test email to a single student
router.post("/test-email", emailController.testEmail);

router.get("/test-smtp", emailController.testSMTPConnection);

// Get email statistics
router.get("/stats", emailController.getEmailStats);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File size too large. Maximum size is 5MB.",
      });
    }
  }

  if (error.message === "Only CSV files are allowed") {
    return res.status(400).json({
      success: false,
      error: "Only CSV files are allowed",
    });
  }

  next(error);
});

module.exports = router;
