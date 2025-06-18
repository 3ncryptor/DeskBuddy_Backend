const express = require("express");
const router = express.Router();
const { getStudentById } = require("../controllers/studentController");

router.get("/:studentId", getStudentById);

module.exports = router;
