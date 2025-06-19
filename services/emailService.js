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
    <title>Your DeskBuddy Arrival QR Code</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #1a237e;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #1a237e;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 16px;
        }
        .student-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #1a237e;
        }
        .student-name {
            font-size: 20px;
            font-weight: bold;
            color: #1a237e;
            margin-bottom: 10px;
        }
        .student-id {
            font-size: 16px;
            color: #666;
            background-color: #e3f2fd;
            padding: 8px 12px;
            border-radius: 6px;
            display: inline-block;
        }
        .qr-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
        }
        .qr-code {
            margin: 20px 0;
        }
        .qr-code img {
            border: 2px solid #1a237e;
            border-radius: 8px;
            padding: 10px;
            background-color: white;
        }
        .qr-download {
            margin-top: 15px;
        }
        .qr-download a {
            display: inline-block;
            background-color: #28a745;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
        }
        .instructions {
            background-color: #e8f5e8;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #28a745;
        }
        .instructions h3 {
            color: #28a745;
            margin-top: 0;
        }
        .instructions ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        .instructions li {
            margin: 8px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
        .contact-info {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
        }
        .contact-info strong {
            color: #856404;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .email-container {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🎓 DeskBuddy</div>
            <div class="subtitle">Your Digital Arrival Assistant</div>
        </div>

        <div class="student-info">
            <div class="student-name">Hi {{name}},</div>
            <div>Your Student ID: <span class="student-id">{{studentId}}</span></div>
        </div>

        <div class="qr-section">
            <h3>📱 Your Arrival QR Code</h3>
            <p>Your personalized QR code is attached to this email as <strong>QR_{{studentId}}.png</strong></p>
            <p>Please save this QR code on your phone or print it for arrival day.</p>
            <div class="qr-fallback" style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
                <h4 style="margin-top: 0; color: #007bff;">📎 About Your QR Code</h4>
                <p style="margin-bottom: 10px;">Your QR code contains your Student ID and will be used for:</p>
                <ul style="margin: 0; padding-left: 20px;">
                    <li><strong>Arrival check-in</strong> at the venue</li>
                    <li><strong>Hostel verification</strong> process</li>
                    <li><strong>Document verification</strong> station</li>
                    <li><strong>Kit collection</strong> at the end</li>
                </ul>
                <p style="margin-top: 15px; margin-bottom: 0; font-size: 14px; color: #666;">
                    <strong>Student ID:</strong> {{studentId}} | <strong>Name:</strong> {{name}}
                </p>
            </div>
        </div>

        <div class="instructions">
            <h3>📋 Arrival Instructions</h3>
            <ol>
                <li><strong>Save this QR code</strong> on your phone or print it</li>
                <li><strong>Arrive at the venue</strong> on your scheduled date</li>
                <li><strong>Show your QR code</strong> to the volunteer at the arrival station</li>
                <li><strong>Get scanned</strong> to complete your check-in</li>
                <li><strong>Follow the process</strong> through all verification stations</li>
            </ol>
        </div>

        <div class="contact-info">
            <strong>Need Help?</strong><br>
            If you have any questions or issues, please contact us at:<br>
            📧 support@deskbuddy.com<br>
            📞 +1 (555) 123-4567
        </div>

        <div class="footer">
            <p>This is an automated message from DeskBuddy System.</p>
            <p>Please do not reply to this email.</p>
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
        dark: "#1a237e",
        light: "#ffffff",
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
        dark: "#1a237e",
        light: "#ffffff",
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
      subject: `Your DeskBuddy Arrival QR Code - ${name}`,
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
