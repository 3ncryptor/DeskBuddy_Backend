# DeskBuddy Backend

A robust, production-ready Node.js backend for the DeskBuddy onboarding and event management system. Handles student onboarding, QR code generation, multi-stage scanning, and bulk email notifications with advanced logging and Supabase integration.

---

## 🚀 Features

- **Express.js REST API** for all onboarding and event flows
- **Supabase** integration for student data storage and updates
- **Bulk Email** sending with CSV upload, QR code attachment, and SMTP (Gmail) support
- **SMS Notifications** for arrival, hostel, and documents verification events
- **QR Code** generation and download for each student
- **Multi-stage Scanning** (arrival, hostel, documents, kit)
- **Robust Logging** to both console (color) and `logs/app.log` (JSON)
- **CSV Parsing** with validation and error reporting
- **Modular Controllers/Services** for clean, maintainable code

---

## 🗂️ Directory Structure

```
deskbuddy-backend/
  controllers/      # Business logic for email, scan, student
  routes/           # API route definitions
  services/         # Email, CSV, Supabase integrations
  utils/            # Logger utility
  uploads/          # Temporary CSV uploads
  logs/             # Log files (gitignored)
  index.js          # Main entry point
  env.example       # Environment variable template
  package.json      # Dependencies and scripts
```

---

## ⚙️ Setup & Installation

1. **Clone the repository:**
   ```sh
   git clone <your-repo-url>
   cd DeskBuddy/deskbuddy-backend
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Configure environment variables:**
   - Copy `env.example` to `.env` and fill in your credentials:
     ```sh
     cp env.example .env
     # Edit .env with your Supabase and Gmail SMTP details
     ```
4. **Start the server:**
   - For production:
     ```sh
     npm start
     ```
   - For development (with auto-reload):
     ```sh
     npm run dev
     ```

---

## 🔑 Environment Variables

| Variable          | Description                          |
| ----------------- | ------------------------------------ |
| SUPABASE_URL      | Your Supabase project URL            |
| SUPABASE_ANON_KEY | Supabase anon/service key            |
| EMAIL_USER        | Gmail address for SMTP               |
| EMAIL_PASSWORD    | Gmail app password                   |
| SMS_BASE_URL      | SMS API base URL                     |
| PORT              | Server port (default: 3001)          |
| NODE_ENV          | Environment (development/production) |

---

## 📦 API Endpoints

### **Student**

- `GET /api/student/:studentId` — Fetch student details

### **Scan**

- `POST /api/scan/arrival` — Mark arrival for a student
- `POST /api/scan/hostel` — Mark hostel verification
- `POST /api/scan/documents` — Mark document verification
- `POST /api/scan/kit` — Mark kit collection

**Request Body (for scan):**

```json
{
  "studentId": "NST124",
  "volunteerName": "John Doe"
}
```

### **Email**

- `POST /api/email/upload-csv` — Upload CSV, send bulk emails with QR
- `GET /api/email/qr-code/:studentId` — Get QR code (data URL)
- `GET /api/email/qr-download/:studentId` — Download QR code (PNG)
- `POST /api/email/test-email` — Send test email
- `GET /api/email/test-smtp` — Test SMTP connection
- `GET /api/email/stats` — Email stats

---

## 📄 CSV Format for Bulk Email

- Required columns: `name`, `email`, `studentid`
- Example:
  ```csv
  name,email,studentid
  Aryan Vibhuti,aryan@example.com,NST123
  Jane Doe,jane@example.com,NST124
  ```

---

## 📝 Logging

- All API/database/scan actions are logged to both console (color-coded) and `logs/app.log` (JSON).
- Log file is gitignored and not pushed to GitHub.
- Log structure includes timestamp, level, message, and context.

---

## 🛡️ Security & Best Practices

- Never commit real credentials; use `.env` for secrets.
- Ensure CORS is configured for your frontend domain.
- Use HTTPS in production (behind a reverse proxy or AWS load balancer).
- Regularly rotate your SMTP and Supabase keys.

---

## ☁️ Deployment Notes

- Can be hosted on AWS EC2, Elastic Beanstalk, or any Node.js-compatible service.
- Expose the chosen `PORT` and ensure security group/firewall allows inbound traffic.
- For persistent logs, consider AWS CloudWatch or similar.

---

## 🤝 Contributing

Pull requests and issues are welcome! Please open an issue to discuss major changes.

---

## 📧 Contact

For support, email: aryanvibhuti@gmail.com

---

**© 2025 DeskBuddy. All rights reserved.**
