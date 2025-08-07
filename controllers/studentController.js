const supabase = require("../services/supabaseClient");
const logger = require("../utils/logger");

const getStudentById = async (req, res) => {
  const { studentId } = req.params;

  logger.api.request("GET", `/api/student/${studentId}`, { studentId });

  try {
    logger.database.query("SELECT", "students", { studentId });

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("studentId", studentId)
      .single();

    if (error) {
      console.log(error);
      logger.database.error("SELECT", "students", error, { studentId });
      logger.api.error("GET", `/api/student/${studentId}`, error, {
        studentId,
      });
      return res
        .status(403)
        .json({ error: "Student not found or access denied" });
    }

    logger.api.response("GET", `/api/student/${studentId}`, 200, {
      studentId,
      studentFound: !!data,
    });

    return res.status(200).json(data);
  } catch (err) {
    console.log(err);
    logger.error("Unexpected backend error", {
      error: err.message,
      studentId,
      stack: err.stack,
    });
    logger.api.error("GET", `/api/student/${studentId}`, err, { studentId });
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { getStudentById };
