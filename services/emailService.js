const nodemailer = require("nodemailer");
const QRCode = require("qrcode");
const handlebars = require("handlebars");
const logger = require("../utils/logger");

// Email template
const emailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Newton School of Technology</title>
  <style>
    body {
      background: #000000;
      margin: 0;
      padding: 0;
      font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #fff;
      min-height: 100vh;
    }
    .fade-in {
      animation: fadeIn 1.2s cubic-bezier(.4,0,.2,1);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(24px) scale(0.98); }
      to { opacity: 1; transform: none; }
    }
    .main-card {
      background: #000000;
      border-radius: 18px;
      max-width: 480px;
      margin: 40px auto;
      box-shadow: 0 6px 32px 0 rgba(124,252,152,0.10);
      border-left: 6px solid #7CFC98;
      padding: 0;
      overflow: hidden;
      transition: box-shadow 0.3s;
    }
    .logo-row {
      text-align: center;
      padding: 32px 0 18px 0;
    }
    .logo {
      font-size: 2rem;
      font-weight: 800;
      color: #7CFC98;
      letter-spacing: 0.02em;
      margin-bottom: 0;
    }
    .inner-card {
      background: #101010;
      border-radius: 14px;
      margin: 18px 24px 0 24px;
      padding: 18px 20px;
      box-shadow: 0 2px 12px 0 rgba(124,252,152,0.06);
      border-left: 4px solid #7CFC98;
      border-top: none;
      border-bottom: none;
      border-right: none;
    }
    .student-info-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 1.08rem;
    }
    .info-label {
      color: #7CFC98;
      font-weight: 600;
      font-size: 0.98rem;
      min-width: 80px;
    }
    .info-value {
      color: #fff;
      font-weight: 700;
      font-size: 1.08rem;
      background: #181f2a;
      border-radius: 8px;
      padding: 4px 14px;
      border-left: 3px solid #7CFC98;
      letter-spacing: 0.01em;
      display: inline-block;
      margin-left: 8px;
    }
    .welcome-message {
      color: #7CFC98;
      font-size: 1.12rem;
      text-align: center;
      margin: 32px 32px 0 32px;
      border-left: 4px solid #7CFC98;
      border-radius: 0 8px 8px 0;
      background: rgba(124,252,152,0.07);
      padding: 18px 20px;
      box-shadow: 0 2px 12px 0 rgba(124,252,152,0.06);
      font-weight: 600;
    }
    .footer {
      text-align: center;
      color: #7CFC98;
      font-size: 0.98rem;
      margin: 32px 0 18px 0;
      letter-spacing: 0.01em;
    }
    @media (max-width: 600px) {
      .main-card { max-width: 98vw; margin: 16px auto; }
      .inner-card { margin: 12px 4vw 0 4vw; padding: 14px 8px; }
      .logo-row { padding: 18px 0 10px 0; }
      .welcome-message { margin: 18px 4vw 0 4vw; padding: 14px 8px; }
    }
  </style>
</head>
<body style="background: #000000;">
  <div class="main-card fade-in">
    <div class="logo-row">
      <div class="logo">🎓 Newton School of Technology</div>
    </div>
    <div class="inner-card">
      <div class="student-info-row">
        <div><span class="info-label">Name</span><span class="info-value">{{name}}</span></div>
        <div><span class="info-label">Student ID</span><span class="info-value">{{studentId}}</span></div>
      </div>
    </div>
    <div class="welcome-message">
      Welcome to Newton School of Technology!<br>
      <span style="color:#fff; font-weight:400; font-size:1rem; display:block; margin-top:10px;">On behalf of all your seniors, we're thrilled to welcome you to our community. We can't wait to see the amazing things you'll achieve. If you ever need help, guidance, or just a friend, we're here for you. Let's make this journey unforgettable—together!</span>
    </div>
    <div class="footer">
      Need help? Contact aryanvibhuti@gmail.com
    </div>
  </div>
</body>
</html>
`;

// Compile the template
const template = handlebars.compile(emailTemplate);

// Create SMTP transporter with multiple provider support
const createTransporter = () => {
  const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    // Additional SMTP options
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
  };

  // Add TLS options if specified
  if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "false") {
    smtpConfig.tls = {
      rejectUnauthorized: false,
    };
  }

  // Add debug mode if specified
  if (process.env.SMTP_DEBUG === "true") {
    smtpConfig.debug = true;
    smtpConfig.logger = true;
  }

  return nodemailer.createTransport(smtpConfig);
};

// Test SMTP connection
const testSMTPConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info("SMTP connection verified successfully");
    return { success: true, message: "SMTP connection verified" };
  } catch (error) {
    logger.error("SMTP connection failed", { error: error.message });
    return { success: false, error: error.message };
  }
};

// Generate QR code for student
const generateQRCode = async (studentid) => {
  try {
    const qrData = JSON.stringify({ studentId: studentid });
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: "#ffffff",
        light: "#000000",
      },
    });
    return qrCodeDataUrl;
  } catch (error) {
    logger.error("QR code generation failed", {
      studentid,
      error: error.message,
    });
    throw error;
  }
};

// Generate QR code as buffer for download
const generateQRCodeBuffer = async (studentid) => {
  try {
    const qrData = JSON.stringify({ studentId: studentid });
    const qrCodeBuffer = await QRCode.toBuffer(qrData, {
      width: 400,
      margin: 4,
      color: {
        dark: "#ffffff",
        light: "#000000",
      },
    });
    return qrCodeBuffer;
  } catch (error) {
    logger.error("QR code buffer generation failed", {
      studentid,
      error: error.message,
    });
    throw error;
  }
};

// Send email to a single student
const sendEmailToStudent = async (student, transporter) => {
  try {
    const { name, email, studentid } = student;

    logger.info("Generating QR code for student", { studentid, email });
    const qrCodeDataUrl = await generateQRCode(studentid);
    const qrCodeBuffer = await generateQRCodeBuffer(studentid);

    // Debug: Log QR code data URL (first 100 chars)
    logger.info("QR code generated", {
      studentid,
      qrCodeDataUrlLength: qrCodeDataUrl.length,
      qrCodeDataUrlStart: qrCodeDataUrl.substring(0, 100) + "...",
      qrCodeBufferLength: qrCodeBuffer.length,
    });

    // Compile email template with student data (without embedded QR code)
    const htmlContent = template({
      name,
      studentId: studentid,
      qrCodeDataUrl: "", // Remove embedded QR code
    });

    // Debug: Log HTML content length
    logger.info("Email HTML compiled", {
      studentid,
      htmlContentLength: htmlContent.length,
      hasQRCodeInHTML: htmlContent.includes("data:image/png;base64"),
    });

    // Email options with attachment
    const mailOptions = {
      from: `"DeskBuddy System" <${
        process.env.SMTP_FROM || process.env.SMTP_USER
      }>`,
      to: email,
      subject: `Your DeskBuddy QR Code - ${name}`,
      html: htmlContent,
      attachments: [
        {
          filename: `QR_${studentid}.png`,
          content: qrCodeBuffer,
          contentType: "image/png",
        },
      ],
    };

    // Send email
    logger.info("Sending email to student", { studentid, email });
    const result = await transporter.sendMail(mailOptions);

    logger.info("Email sent successfully", {
      studentid,
      email,
      messageId: result.messageId,
    });

    return { success: true, studentid, email, messageId: result.messageId };
  } catch (error) {
    logger.error("Email sending failed", {
      studentid: student.studentid,
      email: student.email,
      error: error.message,
    });
    return {
      success: false,
      studentid: student.studentid,
      email: student.email,
      error: error.message,
    };
  }
};

// Send emails to multiple students with rate limiting
const sendBulkEmails = async (students, options = {}) => {
  try {
    logger.info("Starting bulk email sending", {
      studentCount: students.length,
    });

    const transporter = createTransporter();

    // Test connection first
    try {
      await transporter.verify();
      logger.info("SMTP connection verified for bulk sending");
    } catch (error) {
      logger.error("SMTP connection failed before bulk sending", {
        error: error.message,
      });
      throw new Error(`SMTP connection failed: ${error.message}`);
    }

    const results = [];
    const batchSize = options.batchSize || 10; // Send emails in batches
    const delayBetweenEmails = options.emailDelay || 1000; // 1 second delay
    const delayBetweenBatches = options.batchDelay || 5000; // 5 second delay between batches

    // Process students in batches
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}`, {
        batchStart: i + 1,
        batchEnd: Math.min(i + batchSize, students.length),
        totalStudents: students.length,
      });

      // Process current batch
      for (let j = 0; j < batch.length; j++) {
        const student = batch[j];
        const result = await sendEmailToStudent(student, transporter);
        results.push(result);

        // Add delay between emails (except for last email in batch)
        if (j < batch.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, delayBetweenEmails)
          );
        }
      }

      // Add delay between batches (except for last batch)
      if (i + batchSize < students.length) {
        logger.info(
          `Batch completed, waiting ${delayBetweenBatches}ms before next batch`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, delayBetweenBatches)
        );
      }
    }

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    logger.info("Bulk email sending completed", {
      total: students.length,
      successful: successful.length,
      failed: failed.length,
    });

    return {
      total: students.length,
      successful: successful.length,
      failed: failed.length,
      results,
    };
  } catch (error) {
    logger.error("Bulk email sending failed", { error: error.message });
    throw error;
  }
};

module.exports = {
  sendBulkEmails,
  generateQRCode,
  generateQRCodeBuffer,
  testSMTPConnection,
  createTransporter,
};
