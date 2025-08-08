const express = require("express");
const router = express.Router();
const {
  getStudentJourney,
  getAllStudentJourneys,
  getPeakHours,
  getVolunteerStats,
  getAnalyticsSummary,
  getStageTimingAnalysis,
  getPendingCounts
} = require("../controllers/analyticsController");

// Get individual student journey progress
router.get("/student-journey/:studentId", getStudentJourney);

// Get all students with their journey progress
router.get("/student-journey", getAllStudentJourneys);

// Get peak hours analysis (hourly scan distribution)
router.get("/peak-hours", getPeakHours);

// Get volunteer performance statistics
router.get("/volunteer-stats", getVolunteerStats);

// Get overall analytics summary
router.get("/summary", getAnalyticsSummary);

// Get stage timing analysis (average time between stages)
router.get("/stage-timing", getStageTimingAnalysis);

// Get pending students count for each stage
router.get("/pending-counts", getPendingCounts);

module.exports = router;
