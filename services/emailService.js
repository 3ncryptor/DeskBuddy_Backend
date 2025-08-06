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
  <title>Welcome to Rishihood University</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7f9;font-family:Arial,sans-serif;">
  <table align="center" width="100%" style="max-width:620px;margin:30px auto;background-color:#ffffff;border:1px solid #ddd;padding:24px;border-radius:10px;box-sizing:border-box;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
    
    <!-- Logo -->
    <tr>
      <td align="center" style="padding-bottom:24px;">
        <img src="https://s3.ap-south-1.amazonaws.com/rishihoodmarketingimg/logo.png" alt="Rishihood University Logo" style="max-width:160px;width:100%;height:auto;">
      </td>
    </tr>

    <!-- Header -->
    <tr>
      <td style="color:#1d1d1f;text-align:center;font-size:22px;font-weight:bold;padding-bottom:12px;">
        Welcome to Rishihood University
      </td>
    </tr>

    <!-- Divider -->
    <tr>
      <td><hr style="border:none;border-top:1px solid #eee;margin:20px 0;"></td>
    </tr>

    <!-- Spacer -->
    <tr><td style="height:20px;"></td></tr>

    <!-- Welcome Message -->
    <tr>
      <td style="color:#333;font-size:14px;line-height:1.7;padding:0 4px;">
        <strong>Dear {{name}},</strong><br><br>

        We’re excited to welcome you to <strong>Rishihood University</strong>!<br><br>

        <!-- Student Details Box -->
        <div style="background-color:#f9f9f9;padding:18px 20px;border-radius:8px;margin-bottom:20px;">
          <p style="color:#222;font-size:14px;margin:0 0 12px;font-weight:600;">Your Details:</p>
          <p style="color:#555;font-size:14px;margin:6px 0;"><strong>Name:</strong> {{name}}</p>
          <p style="color:#555;font-size:14px;margin:6px 0;"><strong>Enrollment ID:</strong> {{studentId}}</p>
        </div>

        To ensure a smooth onboarding experience, we’ve introduced a <strong>QR code-based check-in process</strong>:<br><br>

        <ul style="padding-left:18px;margin:0;">
          <li style="color:#555;font-size:14px;margin-bottom:10px;line-height:1.6;">This QR code is your key – you’ll scan it at all checkpoints, including hostel check-in, ID card generation, welcome kit collection, and more.</li>
          <li style="color:#555;font-size:14px;margin-bottom:10px;line-height:1.6;">Please keep your QR code easily accessible on your phone at all times.</li>
          <li style="color:#555;font-size:14px;margin-bottom:10px;line-height:1.6;">We’ve shared the complete onboarding flow below — please take a moment to review it before arriving on campus.</li>
        </ul><br>

        <!-- CTA Button -->
        <div style="text-align:center;margin-top:10px;">
          <a href="https://drive.google.com/file/d/1VBL5ggf4bJt9p74zJO_TlJlEbdb1D7Go/view?usp=sharing"
             style="display:inline-block;background-color:#d9541b;color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:6px;font-weight:bold;font-size:16px;border:2px solid transparent;">
            View Onboarding Flow
          </a>
        </div><br>

        We’re thrilled to have you join the Rishihood family and can’t wait to meet you in person!<br><br>

        Warm regards,<br>
        <strong>Team Rishihood</strong>
      </td>
    </tr>

    <!-- Spacer -->
    <tr><td style="height:30px;"></td></tr>

    <!-- Footer Help Info -->
    <tr>
      <td style="color:#555;text-align:center;font-size:14px;line-height:1.6;padding:0 4px;">
        Need assistance or have questions?<br>
        Reach us at <strong><a href="mailto:tech@rishihood.edu.in" style="color:#d9541b;text-decoration:none;">tech@rishihood.edu.in</a></strong>
      </td>
    </tr>

    <!-- Legal Footer -->
    <tr>
      <td style="color:#999;text-align:center;font-size:12px;padding-top:20px;">
        © 2025 Rishihood University. All rights reserved.
      </td>
    </tr>
  </table>
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
      from: `"Rishihood University" <${
        process.env.SMTP_FROM || process.env.SMTP_USER
      }>`,
      to: email,
      subject: `Welcome to Rishihood University - ${name}`,
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
