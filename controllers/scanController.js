const supabase = require("../services/supabaseClient");
const logger = require("../utils/logger");
const paymentService = require("../services/paymentService");
const smsService = require("../services/smsService");

const allowedStages = {
  arrival: ["arrival", "arrivalVerifiedBy", "arrivalTime"],
  hostel: ["hostelVerified", "hostelVerifiedBy", "hostelVerifiedTime"],
  documents: [
    "documentsVerified",
    "documentsVerifiedBy",
    "documentsVerifiedTime",
  ],
  kit: ["kitReceived", "kitReceivedBy", "kitReceivedTime"],
};

const scanStage = async (req, res) => {
  const { studentId, volunteerName } = req.body;
  const { stage } = req.params;

  if (!allowedStages[stage]) {
    logger.warn("Invalid stage scan attempt", { stage });
    return res.status(400).json({ error: "Invalid stage" });
  }

  const [statusField, verifiedByField, timeField] = allowedStages[stage];

  logger.info("Updating scan stage", {
    studentId,
    stage,
    updatedFields: [statusField, verifiedByField, timeField],
  });

  try {
    const { error } = await supabase
      .from("students")
      .update({
        [statusField]: true,
        [verifiedByField]: volunteerName,
        [timeField]: new Date().toISOString(),
      })
      .eq("studentId", studentId);

    if (error) {
      logger.error("Supabase update error", { error: error.message });
      return res.status(500).json({ error: "Failed to update student stage" });
    }

    logger.info("Stage scan updated successfully", { studentId, stage });
    res.status(200).json({ updated: true });
  } catch (err) {
    logger.error("Unexpected error in scan route", { error: err.message });
    res.status(500).json({ error: "Internal server error" });
  }
};

const scanArrival = async (req, res) => {
  const { studentId, volunteerName } = req.body;

  logger.scan.start("arrival", studentId, { volunteerName });
  logger.api.request("POST", "/api/scan/arrival", { studentId, volunteerName });

  if (!studentId || !volunteerName) {
    logger.warn("Missing required fields for arrival scan", {
      studentId,
      volunteerName,
    });
    logger.api.error("POST", "/api/scan/arrival", "Missing required fields", {
      studentId,
      volunteerName,
    });
    return res
      .status(400)
      .json({ error: "studentId and volunteerName are required" });
  }

  try {
    // First, check if student exists
    logger.database.query("SELECT", "students", { studentId });

    const { data: student, error: fetchError } = await supabase
      .from("students")
      .select("*")
      .eq("studentId", studentId)
      .single();

    if (fetchError || !student) {
      logger.database.error("SELECT", "students", fetchError, { studentId });
      logger.scan.error(
        "arrival",
        studentId,
        fetchError || "Student not found",
        { volunteerName }
      );
      logger.api.error(
        "POST",
        "/api/scan/arrival",
        fetchError || "Student not found",
        { studentId, volunteerName }
      );
      return res.status(404).json({ error: "Student not found" });
    }

    // Always call the external payment API to get dueAmount
    let dueAmount = null;
    const paymentResult = await paymentService.getPaymentData(studentId);
    if (paymentResult.success) {
      dueAmount = paymentResult.dueAmount;
    } else {
      logger.error("Failed to fetch payment data", {
        studentId,
        error: paymentResult.error,
      });
    }

    // Check if already arrived
    if (student.arrival) {
      logger.warn("Student already arrived", {
        studentId,
        arrivalTime: student.arrivalTime,
        previouslyVerifiedBy: student.arrivalVerifiedBy,
      });
      logger.scan.error("arrival", studentId, "Already arrived", {
        volunteerName,
      });
      logger.api.response("POST", "/api/scan/arrival", 409, {
        studentId,
        error: "Already arrived",
        arrivalTime: student.arrivalTime,
      });
      return res.status(409).json({
        error: "Student has already arrived",
        arrivalTime: student.arrivalTime,
        verifiedBy: student.arrivalVerifiedBy,
        dueAmount,
      });
    }

    // Update arrival status
    const currentTime = new Date().toISOString();
    logger.database.query("UPDATE", "students", {
      studentId,
      fields: ["arrival", "arrivalVerifiedBy", "arrivalTime"],
    });

    const { data: updatedStudent, error: updateError } = await supabase
      .from("students")
      .update({
        arrival: true,
        arrivalVerifiedBy: volunteerName,
        arrivalTime: currentTime,
      })
      .eq("studentId", studentId)
      .select()
      .single();

    if (updateError) {
      logger.database.error("UPDATE", "students", updateError, { studentId });
      logger.scan.error("arrival", studentId, updateError, { volunteerName });
      logger.api.error("POST", "/api/scan/arrival", updateError, {
        studentId,
        volunteerName,
      });
      return res.status(500).json({ error: "Failed to update arrival status" });
    }

    logger.scan.success("arrival", studentId, {
      volunteerName,
      arrivalTime: currentTime,
    });
    logger.api.response("POST", "/api/scan/arrival", 200, {
      studentId,
      volunteerName,
      arrivalTime: currentTime,
    });

    // Send SMS notification for arrival (don't wait for it to complete)
    smsService
      .sendArrivalNotification({
        studentId: updatedStudent.studentId,
      })
      .then((smsResult) => {
        if (smsResult.success) {
          logger.info("Arrival SMS sent successfully", {
            studentId,
            messageId: smsResult.messageId,
          });
        } else {
          logger.warn("Failed to send arrival SMS", {
            studentId,
            error: smsResult.error,
          });
        }
      })
      .catch((err) => {
        logger.error("SMS sending error for arrival", {
          studentId,
          error: err.message,
        });
      });

    return res.status(200).json({
      message: "Arrival recorded successfully",
      student: updatedStudent,
      dueAmount,
    });
  } catch (err) {
    console.log(err);
    logger.error("Unexpected error in arrival scan", {
      error: err.message,
      studentId,
      volunteerName,
      stack: err.stack,
    });
    logger.scan.error("arrival", studentId, err, { volunteerName });
    logger.api.error("POST", "/api/scan/arrival", err, {
      studentId,
      volunteerName,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
};

// module.exports = { scanStage, scanArrival };

const scanHostel = async (req, res) => {
  const { studentId, volunteerName } = req.body;
  logger.info("Hostel scan request", { studentId, volunteerName });

  if (!studentId || !volunteerName) {
    logger.error("Missing required fields", { studentId, volunteerName });
    return res
      .status(400)
      .json({ error: "studentId and volunteerName are required" });
  }

  try {
    const { data: student, error: fetchError } = await supabase
      .from("students")
      .select("*")
      .eq("studentId", studentId)
      .single();

    if (fetchError || !student) {
      logger.error("Student not found", {
        studentId,
        error: fetchError?.message,
      });
      return res.status(404).json({ error: "Student not found" });
    }

    if (student.hostelVerified) {
      logger.warn("Student already hostel verified", {
        studentId,
        hostelVerifiedTime: student.hostelVerifiedTime,
      });
      return res.status(409).json({
        error: "Student already verified at hostel",
        hostelVerifiedTime: student.hostelVerifiedTime,
        verifiedBy: student.hostelVerifiedBy,
      });
    }

    const currentTime = new Date().toISOString();
    const { data: updatedStudent, error: updateError } = await supabase
      .from("students")
      .update({
        hostelVerified: true,
        hostelVerifiedBy: volunteerName,
        hostelVerifiedTime: currentTime,
      })
      .eq("studentId", studentId)
      .select()
      .single();

    if (updateError) {
      logger.error("Failed to update hostel status", {
        studentId,
        error: updateError.message,
      });
      return res.status(500).json({ error: "Failed to update hostel status" });
    }

    logger.info("Hostel scan successful", {
      studentId,
      volunteerName,
      hostelVerifiedTime: currentTime,
    });

    // Send SMS notification for hostel verification (don't wait for it to complete)
    smsService
      .sendHostelNotification({
        studentId: updatedStudent.studentId,
      })
      .then((smsResult) => {
        if (smsResult.success) {
          logger.info("Hostel verification SMS sent successfully", {
            studentId,
            messageId: smsResult.messageId,
          });
        } else {
          logger.warn("Failed to send hostel verification SMS", {
            studentId,
            error: smsResult.error,
          });
        }
      })
      .catch((err) => {
        logger.error("SMS sending error for hostel verification", {
          studentId,
          error: err.message,
        });
      });

    return res.status(200).json({
      message: "Hostel verification recorded",
      student: updatedStudent,
    });
  } catch (err) {
    logger.error("Unexpected error in hostel scan", { error: err.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

const scanDocuments = async (req, res) => {
  const { studentId, volunteerName } = req.body;
  logger.info("Document scan request", { studentId, volunteerName });

  if (!studentId || !volunteerName) {
    logger.error("Missing required fields", { studentId, volunteerName });
    return res
      .status(400)
      .json({ error: "studentId and volunteerName are required" });
  }

  try {
    const { data: student, error: fetchError } = await supabase
      .from("students")
      .select("*")
      .eq("studentId", studentId)
      .single();

    if (fetchError || !student) {
      logger.error("Student not found", {
        studentId,
        error: fetchError?.message,
      });
      return res.status(404).json({ error: "Student not found" });
    }

    if (student.documentsVerified) {
      logger.warn("Student documents already verified", {
        studentId,
        documentsVerifiedTime: student.documentsVerifiedTime,
      });
      return res.status(409).json({
        error: "Student documents already verified",
        documentsVerifiedTime: student.documentsVerifiedTime,
        verifiedBy: student.documentsVerifiedBy,
      });
    }

    const currentTime = new Date().toISOString();
    const { data: updatedStudent, error: updateError } = await supabase
      .from("students")
      .update({
        documentsVerified: true,
        documentsVerifiedBy: volunteerName,
        documentsVerifiedTime: currentTime,
      })
      .eq("studentId", studentId)
      .select()
      .single();

    if (updateError) {
      logger.error("Failed to update document status", {
        studentId,
        error: updateError.message,
      });
      return res
        .status(500)
        .json({ error: "Failed to update document status" });
    }

    logger.info("Document scan successful", {
      studentId,
      volunteerName,
      documentsVerifiedTime: currentTime,
    });

    smsService
      .sendDocumentsNotification({
        studentId: updatedStudent.studentId,
      })
      .then((smsResult) => {
        if (smsResult.success) {
          logger.info("Documents verification SMS sent successfully", {
            studentId,
            messageId: smsResult.messageId,
          });
        } else {
          logger.warn("Failed to send documents verification SMS", {
            studentId,
            error: smsResult.error,
          });
        }
      })
      .catch((err) => {
        logger.error("SMS sending error for documents verification", {
          studentId,
          error: err.message,
        });
      });

    return res.status(200).json({
      message: "Documents verification recorded",
      student: updatedStudent,
    });
  } catch (err) {
    logger.error("Unexpected error in document scan", { error: err.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

const scanKit = async (req, res) => {
  const { studentId, volunteerName } = req.body;
  logger.info("Kit scan request", { studentId, volunteerName });

  if (!studentId || !volunteerName) {
    logger.error("Missing required fields", { studentId, volunteerName });
    return res
      .status(400)
      .json({ error: "studentId and volunteerName are required" });
  }

  try {
    const { data: student, error: fetchError } = await supabase
      .from("students")
      .select("*")
      .eq("studentId", studentId)
      .single();

    if (fetchError || !student) {
      logger.error("Student not found", {
        studentId,
        error: fetchError?.message,
      });
      return res.status(404).json({ error: "Student not found" });
    }

    if (student.kitReceived) {
      logger.warn("Student already received kit", {
        studentId,
        kitReceivedTime: student.kitReceivedTime,
      });
      return res.status(409).json({
        error: "Kit already received",
        kitReceivedTime: student.kitReceivedTime,
        verifiedBy: student.kitReceivedBy,
      });
    }

    const currentTime = new Date().toISOString();
    const { data: updatedStudent, error: updateError } = await supabase
      .from("students")
      .update({
        kitReceived: true,
        kitReceivedBy: volunteerName,
        kitReceivedTime: currentTime,
      })
      .eq("studentId", studentId)
      .select()
      .single();

    if (updateError) {
      logger.error("Failed to update kit status", {
        studentId,
        error: updateError.message,
      });
      return res.status(500).json({ error: "Failed to update kit status" });
    }

    logger.info("Kit scan successful", {
      studentId,
      volunteerName,
      kitReceivedTime: currentTime,
    });
    return res
      .status(200)
      .json({ message: "Kit delivery recorded", student: updatedStudent });
  } catch (err) {
    logger.error("Unexpected error in kit scan", { error: err.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

const updateVisitorCount = async (req, res) => {
  const { studentId, visitorCount } = req.body;

  logger.info("Updating visitor count", { studentId, visitorCount });
  logger.api.request("POST", "/api/scan/arrival/visitors", {
    studentId,
    visitorCount,
  });

  if (!studentId || visitorCount === undefined || visitorCount < 0) {
    logger.warn("Invalid visitor count request", { studentId, visitorCount });
    logger.api.error(
      "POST",
      "/api/scan/arrival/visitors",
      "Invalid parameters",
      { studentId, visitorCount }
    );
    return res
      .status(400)
      .json({ error: "studentId and valid visitorCount are required" });
  }

  try {
    // First, check if student exists and has arrived
    logger.database.query("SELECT", "students", { studentId });

    const { data: student, error: fetchError } = await supabase
      .from("students")
      .select("*")
      .eq("studentId", studentId)
      .single();

    if (fetchError || !student) {
      logger.database.error("SELECT", "students", fetchError, { studentId });
      logger.api.error(
        "POST",
        "/api/scan/arrival/visitors",
        fetchError || "Student not found",
        { studentId, visitorCount }
      );
      return res.status(404).json({ error: "Student not found" });
    }

    if (!student.arrival) {
      logger.warn("Student has not arrived yet", { studentId });
      logger.api.error(
        "POST",
        "/api/scan/arrival/visitors",
        "Student not arrived",
        { studentId, visitorCount }
      );
      return res
        .status(400)
        .json({ error: "Student must be marked as arrived first" });
    }

    // Update visitor count
    const currentTime = new Date().toISOString();
    logger.database.query("UPDATE", "students", {
      studentId,
      fields: ["visitorCount"],
    });

    const { data: updatedStudent, error: updateError } = await supabase
      .from("students")
      .update({
        visitorCount: visitorCount,
      })
      .eq("studentId", studentId)
      .select()
      .single();

    if (updateError) {
      logger.database.error("UPDATE", "students", updateError, { studentId });
      logger.api.error("POST", "/api/scan/arrival/visitors", updateError, {
        studentId,
        visitorCount,
      });
      return res.status(500).json({ error: "Failed to update visitor count" });
    }

    logger.info("Visitor count updated successfully", {
      studentId,
      visitorCount,
      updatedAt: currentTime,
    });
    logger.api.response("POST", "/api/scan/arrival/visitors", 200, {
      studentId,
      visitorCount,
      updatedAt: currentTime,
    });

    return res.status(200).json({
      message: "Visitor count updated successfully",
      student: updatedStudent,
    });
  } catch (err) {
    logger.error("Unexpected error updating visitor count", {
      error: err.message,
      studentId,
      visitorCount,
      stack: err.stack,
    });
    logger.api.error("POST", "/api/scan/arrival/visitors", err, {
      studentId,
      visitorCount,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  scanArrival,
  scanHostel,
  scanDocuments,
  scanKit,
  updateVisitorCount,
};
