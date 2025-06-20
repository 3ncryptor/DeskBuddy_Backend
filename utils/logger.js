const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "..", "logs", "app.log");

const createLogEntry = (level, message, data = {}) => {
  return {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...data,
    pid: process.pid,
    service: "deskbuddy-backend"
  };
};

const writeLog = (logEntry) => {
  const logString = JSON.stringify(logEntry, null, 2);
  
  // Console output with color coding
  const colors = {
    INFO: '\x1b[32m',   // Green
    WARN: '\x1b[33m',   // Yellow
    ERROR: '\x1b[31m',  // Red
    DEBUG: '\x1b[36m'   // Cyan
  };
  
  const reset = '\x1b[0m';
  const color = colors[logEntry.level] || '';
  
  console.log(`${color}${logString}${reset}`);
  
  // File output (without colors)
  try {
    fs.appendFileSync(logFile, logString + "\n");
  } catch (error) {
    console.error(`Failed to write to log file: ${error.message}`);
  }
};

const log = (level, message, data = {}) => {
  const logEntry = createLogEntry(level, message, data);
  writeLog(logEntry);
};

module.exports = {
  info: (message, data = {}) => log("INFO", message, data),
  warn: (message, data = {}) => log("WARN", message, data),
  error: (message, data = {}) => log("ERROR", message, data),
  debug: (message, data = {}) => log("DEBUG", message, data),
  
  // Specialized logging methods
  api: {
    request: (method, path, data = {}) => log("INFO", "API Request", {
      type: "api_request",
      method,
      path,
      ...data
    }),
    
    response: (method, path, statusCode, data = {}) => log("INFO", "API Response", {
      type: "api_response",
      method,
      path,
      statusCode,
      ...data
    }),
    
    error: (method, path, error, data = {}) => log("ERROR", "API Error", {
      type: "api_error",
      method,
      path,
      error: error.message || error,
      ...data
    })
  },
  
  database: {
    query: (operation, table, data = {}) => log("DEBUG", "Database Query", {
      type: "db_query",
      operation,
      table,
      ...data
    }),
    
    error: (operation, table, error, data = {}) => log("ERROR", "Database Error", {
      type: "db_error",
      operation,
      table,
      error: error.message || error,
      ...data
    })
  },
  
  scan: {
    start: (stage, studentId, data = {}) => log("INFO", "Scan Started", {
      type: "scan_start",
      stage,
      studentId,
      ...data
    }),
    
    success: (stage, studentId, data = {}) => log("INFO", "Scan Successful", {
      type: "scan_success",
      stage,
      studentId,
      ...data
    }),
    
    error: (stage, studentId, error, data = {}) => log("ERROR", "Scan Error", {
      type: "scan_error",
      stage,
      studentId,
      error: error.message || error,
      ...data
    })
  }
};
