const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Parse CSV file and extract student data
const parseCSV = (filePath) => {
  try {
    logger.info("Starting CSV parsing", { filePath });
    
    // Read file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }
    
    // Parse header
    const header = lines[0].split(',').map(col => col.trim().toLowerCase());
    logger.info("CSV header detected", { header });
    
    // Validate required columns
    const requiredColumns = ['name', 'email', 'studentid'];
    const missingColumns = requiredColumns.filter(col => !header.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }
    
    // Parse data rows
    const students = [];
    const errors = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      const rowNumber = i + 1;
      
      // Skip empty lines
      if (!line) {
        continue;
      }
      
      try {
        // Split by comma, but handle quoted values
        const values = parseCSVLine(line);
        
        // Debug: log the values array for each row
        logger.info("Parsed values for row", { rowNumber, values });
        
        if (values.length !== header.length) {
          errors.push({
            row: rowNumber,
            error: `Column count mismatch. Expected ${header.length}, got ${values.length}`
          });
          continue;
        }
        
        // Create student object
        const student = {};
        header.forEach((col, index) => {
          student[col] = values[index].trim();
        });
        
        // Debug: log the first student object
        if (students.length === 0) {
          logger.info("First parsed student object", { student });
        }
        
        // Validate student data
        const validationError = validateStudentData(student, rowNumber);
        if (validationError) {
          errors.push(validationError);
          continue;
        }
        
        // Normalize student data
        student.name = student.name.trim();
        student.email = student.email.toLowerCase().trim();
        student.studentid = student.studentid.trim();
        
        students.push(student);
        
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: `Parsing error: ${error.message}`
        });
      }
    }
    
    logger.info("CSV parsing completed", {
      totalRows: lines.length - 1,
      validStudents: students.length,
      errors: errors.length
    });
    
    return {
      students,
      errors,
      summary: {
        totalRows: lines.length - 1,
        validStudents: students.length,
        errorCount: errors.length
      }
    };
    
  } catch (error) {
    logger.error("CSV parsing failed", { filePath, error: error.message });
    throw error;
  }
};

// Parse a single CSV line, handling quoted values
const parseCSVLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of value
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last value
  values.push(current);
  
  return values;
};

// Validate student data
const validateStudentData = (student, rowNumber) => {
  const { name, email, studentid } = student;
  
  // Check for required fields
  if (!name || name.trim() === '') {
    return {
      row: rowNumber,
      error: 'Name is required'
    };
  }
  
  if (!email || email.trim() === '') {
    return {
      row: rowNumber,
      error: 'Email is required'
    };
  }
  
  if (!studentid || studentid.trim() === '') {
    return {
      row: rowNumber,
      error: 'Student ID is required'
    };
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      row: rowNumber,
      error: `Invalid email format: ${email}`
    };
  }
  
  // Validate name (should not contain special characters except spaces and hyphens)
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(name)) {
    return {
      row: rowNumber,
      error: `Invalid name format: ${name}`
    };
  }
  
  // Validate student ID (alphanumeric)
  const studentIdRegex = /^[a-zA-Z0-9]+$/;
  if (!studentIdRegex.test(studentid)) {
    return {
      row: rowNumber,
      error: `Invalid student ID format: ${studentid}`
    };
  }
  
  return null; // No validation errors
};

// Save uploaded file
const saveUploadedFile = (file, uploadDir = 'uploads') => {
  try {
    // Create upload directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const fileName = `${baseName}_${timestamp}${extension}`;
    const filePath = path.join(uploadDir, fileName);
    
    // Save file
    fs.writeFileSync(filePath, file.buffer);
    
    logger.info("File saved successfully", { 
      originalName, 
      savedPath: filePath 
    });
    
    return filePath;
    
  } catch (error) {
    logger.error("File save failed", { 
      originalName: file.originalname, 
      error: error.message 
    });
    throw error;
  }
};

// Clean up uploaded file
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info("File cleaned up", { filePath });
    }
  } catch (error) {
    logger.error("File cleanup failed", { filePath, error: error.message });
  }
};

module.exports = {
  parseCSV,
  saveUploadedFile,
  cleanupFile
}; 