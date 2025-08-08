const supabase = require("../services/supabaseClient");
const logger = require("../utils/logger");

// Get individual student journey progress
const getStudentJourney = async (req, res) => {
  const { studentId } = req.params;

  logger.api.request("GET", `/api/analytics/student-journey/${studentId}`, { studentId });

  try {
    const { data: student, error } = await supabase
      .from("students")
      .select("*")
      .eq("studentId", studentId)
      .single();

    if (error || !student) {
      logger.api.error("GET", `/api/analytics/student-journey/${studentId}`, error || "Student not found", { studentId });
      return res.status(404).json({ error: "Student not found" });
    }

    // Determine current stage
    let currentStage = "Not Started";
    let stageProgress = {
      arrival: false,
      hostel: false,
      documents: false,
      kit: false
    };

    if (student.arrival) {
      currentStage = "Arrival";
      stageProgress.arrival = true;
    }
    if (student.hostelVerified) {
      currentStage = "Hostel";
      stageProgress.hostel = true;
    }
    if (student.documentsVerified) {
      currentStage = "Documents";
      stageProgress.documents = true;
    }
    if (student.kitReceived) {
      currentStage = "Kit";
      stageProgress.kit = true;
    }

    const journeyData = {
      studentId: student.studentId,
      name: student.name,
      currentStage,
      stageProgress,
      arrivalTime: student.arrivalTime,
      hostelVerifiedTime: student.hostelVerifiedTime,
      documentsVerifiedTime: student.documentsVerifiedTime,
      kitReceivedTime: student.kitReceivedTime,
      arrivalVerifiedBy: student.arrivalVerifiedBy,
      hostelVerifiedBy: student.hostelVerifiedBy,
      documentsVerifiedBy: student.documentsVerifiedBy,
      kitReceivedBy: student.kitReceivedBy,
      visitorCount: student.visitorCount
    };

    logger.api.response("GET", `/api/analytics/student-journey/${studentId}`, 200, { studentId, currentStage });
    res.json(journeyData);
  } catch (err) {
    logger.error("Error fetching student journey", { studentId, error: err.message });
    logger.api.error("GET", `/api/analytics/student-journey/${studentId}`, err, { studentId });
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all students with their journey progress
const getAllStudentJourneys = async (req, res) => {
  logger.api.request("GET", "/api/analytics/student-journey", {});

  try {
    const { data: students, error } = await supabase
      .from("students")
      .select("*")
      .order("studentId");

    if (error) {
      logger.api.error("GET", "/api/analytics/student-journey", error, {});
      return res.status(500).json({ error: "Failed to fetch students" });
    }

    const journeys = students.map(student => {
      let currentStage = "Not Started";
      let stageProgress = {
        arrival: false,
        hostel: false,
        documents: false,
        kit: false
      };

      if (student.arrival) {
        currentStage = "Arrival";
        stageProgress.arrival = true;
      }
      if (student.hostelVerified) {
        currentStage = "Hostel";
        stageProgress.hostel = true;
      }
      if (student.documentsVerified) {
        currentStage = "Documents";
        stageProgress.documents = true;
      }
      if (student.kitReceived) {
        currentStage = "Kit";
        stageProgress.kit = true;
      }

      return {
        studentId: student.studentId,
        name: student.name,
        currentStage,
        stageProgress,
        arrivalTime: student.arrivalTime,
        hostelVerifiedTime: student.hostelVerifiedTime,
        documentsVerifiedTime: student.documentsVerifiedTime,
        kitReceivedTime: student.kitReceivedTime,
        arrivalVerifiedBy: student.arrivalVerifiedBy,
        hostelVerifiedBy: student.hostelVerifiedBy,
        documentsVerifiedBy: student.documentsVerifiedBy,
        kitReceivedBy: student.kitReceivedBy,
        visitorCount: student.visitorCount
      };
    });

    logger.api.response("GET", "/api/analytics/student-journey", 200, { count: journeys.length });
    res.json(journeys);
  } catch (err) {
    logger.error("Error fetching all student journeys", { error: err.message });
    logger.api.error("GET", "/api/analytics/student-journey", err, {});
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get peak hours analysis with flexible time intervals
const getPeakHours = async (req, res) => {
  const { interval = '60' } = req.query; // Default to 60 minutes (hourly)
  logger.api.request("GET", "/api/analytics/peak-hours", { interval });

  try {
    // Get all students with their stage timestamps
    const { data: students, error } = await supabase
      .from("students")
      .select("arrivalTime, hostelVerifiedTime, documentsVerifiedTime, kitReceivedTime, arrival, hostelVerified, documentsVerified, kitReceived");

    if (error) {
      logger.api.error("GET", "/api/analytics/peak-hours", error, {});
      return res.status(500).json({ error: "Failed to fetch scan data" });
    }

    // Parse interval to minutes
    const intervalMinutes = parseInt(interval);
    if (![15, 30, 45, 60].includes(intervalMinutes)) {
      return res.status(400).json({ error: "Invalid interval. Must be 15, 30, 45, or 60 minutes" });
    }

    // Calculate number of intervals per day
    const intervalsPerDay = (24 * 60) / intervalMinutes; // 96 for 15min, 48 for 30min, 32 for 45min, 24 for 60min

    // Initialize interval counts for each stage
    const intervalCounts = {
      arrival: {},
      hostel: {},
      documents: {},
      kit: {}
    };

    // Initialize all intervals for each stage
    for (let i = 0; i < intervalsPerDay; i++) {
      intervalCounts.arrival[i] = 0;
      intervalCounts.hostel[i] = 0;
      intervalCounts.documents[i] = 0;
      intervalCounts.kit[i] = 0;
    }

    // Helper function to get interval index from date
    const getIntervalIndex = (date) => {
      const totalMinutes = date.getHours() * 60 + date.getMinutes();
      return Math.floor(totalMinutes / intervalMinutes);
    };

    // Helper function to format interval label
    const formatIntervalLabel = (index) => {
      const totalMinutes = index * intervalMinutes;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (intervalMinutes === 60) {
        return `${hours.toString().padStart(2, '0')}:00`;
      } else {
        const endMinutes = totalMinutes + intervalMinutes;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} - ${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      }
    };

    // Count students by interval for each stage
    students.forEach(student => {
      // Arrival stage
      if (student.arrival && student.arrivalTime) {
        try {
          const date = new Date(student.arrivalTime);
          const intervalIndex = getIntervalIndex(date);
          if (intervalIndex >= 0 && intervalIndex < intervalsPerDay) {
            intervalCounts.arrival[intervalIndex]++;
          }
        } catch (err) {
          logger.warn("Invalid arrival timestamp", { timestamp: student.arrivalTime });
        }
      }

      // Hostel stage
      if (student.hostelVerified && student.hostelVerifiedTime) {
        try {
          const date = new Date(student.hostelVerifiedTime);
          const intervalIndex = getIntervalIndex(date);
          if (intervalIndex >= 0 && intervalIndex < intervalsPerDay) {
            intervalCounts.hostel[intervalIndex]++;
          }
        } catch (err) {
          logger.warn("Invalid hostel timestamp", { timestamp: student.hostelVerifiedTime });
        }
      }

      // Documents stage
      if (student.documentsVerified && student.documentsVerifiedTime) {
        try {
          const date = new Date(student.documentsVerifiedTime);
          const intervalIndex = getIntervalIndex(date);
          if (intervalIndex >= 0 && intervalIndex < intervalsPerDay) {
            intervalCounts.documents[intervalIndex]++;
          }
        } catch (err) {
          logger.warn("Invalid documents timestamp", { timestamp: student.documentsVerifiedTime });
        }
      }

      // Kit stage
      if (student.kitReceived && student.kitReceivedTime) {
        try {
          const date = new Date(student.kitReceivedTime);
          const intervalIndex = getIntervalIndex(date);
          if (intervalIndex >= 0 && intervalIndex < intervalsPerDay) {
            intervalCounts.kit[intervalIndex]++;
          }
        } catch (err) {
          logger.warn("Invalid kit timestamp", { timestamp: student.kitReceivedTime });
        }
      }
    });

    // Convert to array format for charts
    const formatIntervalData = (stageData) => {
      return Object.entries(stageData)
        .map(([index, count]) => ({
          interval: parseInt(index),
          count,
          label: formatIntervalLabel(parseInt(index))
        }))
        .sort((a, b) => a.interval - b.interval);
    };

    const intervalData = {
      arrival: formatIntervalData(intervalCounts.arrival),
      hostel: formatIntervalData(intervalCounts.hostel),
      documents: formatIntervalData(intervalCounts.documents),
      kit: formatIntervalData(intervalCounts.kit)
    };

    // Find peak intervals for each stage
    const findPeakInterval = (stageData) => {
      const peak = Object.entries(stageData).reduce((a, b) => 
        stageData[a[0]] > stageData[b[0]] ? a : b
      );
      return {
        interval: parseInt(peak[0]),
        count: peak[1],
        label: formatIntervalLabel(parseInt(peak[0]))
      };
    };

    const peakIntervals = {
      arrival: findPeakInterval(intervalCounts.arrival),
      hostel: findPeakInterval(intervalCounts.hostel),
      documents: findPeakInterval(intervalCounts.documents),
      kit: findPeakInterval(intervalCounts.kit)
    };

    // Calculate totals for each stage
    const totals = {
      arrival: Object.values(intervalCounts.arrival).reduce((a, b) => a + b, 0),
      hostel: Object.values(intervalCounts.hostel).reduce((a, b) => a + b, 0),
      documents: Object.values(intervalCounts.documents).reduce((a, b) => a + b, 0),
      kit: Object.values(intervalCounts.kit).reduce((a, b) => a + b, 0)
    };

    // Overall peak interval (across all stages)
    const allIntervalCounts = {};
    for (let i = 0; i < intervalsPerDay; i++) {
      allIntervalCounts[i] = intervalCounts.arrival[i] + intervalCounts.hostel[i] + 
                            intervalCounts.documents[i] + intervalCounts.kit[i];
    }

    const overallPeakInterval = Object.entries(allIntervalCounts).reduce((a, b) => 
      allIntervalCounts[a[0]] > allIntervalCounts[b[0]] ? a : b
    );

    const result = {
      intervalMinutes,
      intervalsPerDay,
      intervalData,
      peakIntervals,
      totals,
      overallPeakInterval: {
        interval: parseInt(overallPeakInterval[0]),
        count: overallPeakInterval[1],
        label: formatIntervalLabel(parseInt(overallPeakInterval[0]))
      },
      totalStudents: Object.values(totals).reduce((a, b) => a + b, 0)
    };

    logger.api.response("GET", "/api/analytics/peak-hours", 200, { 
      intervalMinutes,
      totalStudents: result.totalStudents,
      overallPeakInterval: result.overallPeakInterval.label 
    });
    res.json(result);
  } catch (err) {
    logger.error("Error fetching peak hours", { error: err.message });
    logger.api.error("GET", "/api/analytics/peak-hours", err, {});
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get volunteer performance statistics (student-based)
const getVolunteerStats = async (req, res) => {
  logger.api.request("GET", "/api/analytics/volunteer-stats", {});

  try {
    const { data: students, error } = await supabase
      .from("students")
      .select("arrivalVerifiedBy, hostelVerifiedBy, documentsVerifiedBy, kitReceivedBy, arrival, hostelVerified, documentsVerified, kitReceived");

    if (error) {
      logger.api.error("GET", "/api/analytics/volunteer-stats", error, {});
      return res.status(500).json({ error: "Failed to fetch volunteer data" });
    }

    // Count students by volunteer for each stage
    const volunteerDetails = {};

    students.forEach(student => {
      // Arrival stage
      if (student.arrival && student.arrivalVerifiedBy) {
        if (!volunteerDetails[student.arrivalVerifiedBy]) {
          volunteerDetails[student.arrivalVerifiedBy] = {
            name: student.arrivalVerifiedBy,
            totalStudents: 0,
            stages: {
              arrival: 0,
              hostel: 0,
              documents: 0,
              kit: 0
            }
          };
        }
        volunteerDetails[student.arrivalVerifiedBy].totalStudents++;
        volunteerDetails[student.arrivalVerifiedBy].stages.arrival++;
      }

      // Hostel stage
      if (student.hostelVerified && student.hostelVerifiedBy) {
        if (!volunteerDetails[student.hostelVerifiedBy]) {
          volunteerDetails[student.hostelVerifiedBy] = {
            name: student.hostelVerifiedBy,
            totalStudents: 0,
            stages: {
              arrival: 0,
              hostel: 0,
              documents: 0,
              kit: 0
            }
          };
        }
        volunteerDetails[student.hostelVerifiedBy].totalStudents++;
        volunteerDetails[student.hostelVerifiedBy].stages.hostel++;
      }

      // Documents stage
      if (student.documentsVerified && student.documentsVerifiedBy) {
        if (!volunteerDetails[student.documentsVerifiedBy]) {
          volunteerDetails[student.documentsVerifiedBy] = {
            name: student.documentsVerifiedBy,
            totalStudents: 0,
            stages: {
              arrival: 0,
              hostel: 0,
              documents: 0,
              kit: 0
            }
          };
        }
        volunteerDetails[student.documentsVerifiedBy].totalStudents++;
        volunteerDetails[student.documentsVerifiedBy].stages.documents++;
      }

      // Kit stage
      if (student.kitReceived && student.kitReceivedBy) {
        if (!volunteerDetails[student.kitReceivedBy]) {
          volunteerDetails[student.kitReceivedBy] = {
            name: student.kitReceivedBy,
            totalStudents: 0,
            stages: {
              arrival: 0,
              hostel: 0,
              documents: 0,
              kit: 0
            }
          };
        }
        volunteerDetails[student.kitReceivedBy].totalStudents++;
        volunteerDetails[student.kitReceivedBy].stages.kit++;
      }
    });

    // Convert to array and sort by total students
    const volunteerStats = Object.values(volunteerDetails)
      .sort((a, b) => b.totalStudents - a.totalStudents);

    const result = {
      volunteers: volunteerStats,
      totalVolunteers: volunteerStats.length,
      totalStudents: Object.values(volunteerDetails).reduce((sum, v) => sum + v.totalStudents, 0),
      topVolunteer: volunteerStats[0] || null
    };

    logger.api.response("GET", "/api/analytics/volunteer-stats", 200, { 
      totalVolunteers: result.totalVolunteers,
      totalStudents: result.totalStudents 
    });
    res.json(result);
  } catch (err) {
    logger.error("Error fetching volunteer stats", { error: err.message });
    logger.api.error("GET", "/api/analytics/volunteer-stats", err, {});
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get overall analytics summary
const getAnalyticsSummary = async (req, res) => {
  logger.api.request("GET", "/api/analytics/summary", {});

  try {
    const { data: students, error } = await supabase
      .from("students")
      .select("*");

    if (error) {
      logger.api.error("GET", "/api/analytics/summary", error, {});
      return res.status(500).json({ error: "Failed to fetch summary data" });
    }

    // Calculate summary statistics
    const totalStudents = students.length;
    const arrivedStudents = students.filter(s => s.arrival).length;
    const hostelVerified = students.filter(s => s.hostelVerified).length;
    const documentsVerified = students.filter(s => s.documentsVerified).length;
    const kitReceived = students.filter(s => s.kitReceived).length;

    // Calculate completion rates
    const arrivalRate = totalStudents > 0 ? (arrivedStudents / totalStudents * 100).toFixed(1) : 0;
    const hostelRate = totalStudents > 0 ? (hostelVerified / totalStudents * 100).toFixed(1) : 0;
    const documentsRate = totalStudents > 0 ? (documentsVerified / totalStudents * 100).toFixed(1) : 0;
    const kitRate = totalStudents > 0 ? (kitReceived / totalStudents * 100).toFixed(1) : 0;

    // Count unique volunteers
    const volunteers = new Set();
    students.forEach(student => {
      [student.arrivalVerifiedBy, student.hostelVerifiedBy, 
       student.documentsVerifiedBy, student.kitReceivedBy]
        .filter(Boolean)
        .forEach(volunteer => volunteers.add(volunteer));
    });

    // Calculate total scans
    const totalScans = arrivedStudents + hostelVerified + documentsVerified + kitReceived;

    // Calculate completion funnel (percentage of those who completed previous stage)
    const completionFunnel = {
      hostelFromArrival: arrivedStudents > 0 ? ((hostelVerified / arrivedStudents) * 100).toFixed(1) : "0.0",
      documentsFromHostel: hostelVerified > 0 ? ((documentsVerified / hostelVerified) * 100).toFixed(1) : "0.0",
      kitFromDocuments: documentsVerified > 0 ? ((kitReceived / documentsVerified) * 100).toFixed(1) : "0.0"
    };

    const summary = {
      totalStudents,
      arrivedStudents,
      hostelVerified,
      documentsVerified,
      kitReceived,
      totalScans,
      uniqueVolunteers: volunteers.size,
      completionRates: {
        arrival: parseFloat(arrivalRate),
        hostel: parseFloat(hostelRate),
        documents: parseFloat(documentsRate),
        kit: parseFloat(kitRate)
      },
      completionFunnel,
      stageDistribution: {
        notStarted: totalStudents - arrivedStudents,
        arrival: arrivedStudents - hostelVerified,
        hostel: hostelVerified - documentsVerified,
        documents: documentsVerified - kitReceived,
        completed: kitReceived
      },
      insights: {
        overallCompletionRate: kitRate + "%",
        biggestDropoff: {
          stage: parseFloat(completionFunnel.documentsFromHostel) < parseFloat(completionFunnel.hostelFromArrival) && 
                 parseFloat(completionFunnel.documentsFromHostel) < parseFloat(completionFunnel.kitFromDocuments) ? "Hostel → Documents" :
                 parseFloat(completionFunnel.hostelFromArrival) < parseFloat(completionFunnel.kitFromDocuments) ? "Arrival → Hostel" : "Documents → Kit",
          percentage: Math.min(parseFloat(completionFunnel.hostelFromArrival), parseFloat(completionFunnel.documentsFromHostel), parseFloat(completionFunnel.kitFromDocuments)).toFixed(1) + "%"
        }
      }
    };

    logger.api.response("GET", "/api/analytics/summary", 200, { 
      totalStudents,
      totalScans,
      uniqueVolunteers: volunteers.size 
    });
    res.json(summary);
  } catch (err) {
    logger.error("Error fetching analytics summary", { error: err.message });
    logger.api.error("GET", "/api/analytics/summary", err, {});
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get stage timing analysis (average time between stages)
const getStageTimingAnalysis = async (req, res) => {
  logger.api.request("GET", "/api/analytics/stage-timing", {});

  try {
    const { data: students, error } = await supabase
      .from("students")
      .select("arrivalTime, hostelVerifiedTime, documentsVerifiedTime, kitReceivedTime, arrival, hostelVerified, documentsVerified, kitReceived");

    if (error) {
      logger.api.error("GET", "/api/analytics/stage-timing", error, {});
      return res.status(500).json({ error: "Failed to fetch timing data" });
    }

    const timingAnalysis = {
      arrivalToHostel: [],
      hostelToDocuments: [],
      documentsToKit: [],
      overallJourney: []
    };

    let studentsAnalyzed = 0;

    students.forEach(student => {
      const times = {
        arrival: student.arrivalTime ? new Date(student.arrivalTime) : null,
        hostel: student.hostelVerifiedTime ? new Date(student.hostelVerifiedTime) : null,
        documents: student.documentsVerifiedTime ? new Date(student.documentsVerifiedTime) : null,
        kit: student.kitReceivedTime ? new Date(student.kitReceivedTime) : null
      };

      // Only analyze students who have completed arrival
      if (!student.arrival || !times.arrival) return;

      studentsAnalyzed++;

      // Arrival → Hostel timing
      if (student.hostelVerified && times.hostel && times.arrival < times.hostel) {
        const diffMs = times.hostel - times.arrival;
        timingAnalysis.arrivalToHostel.push(diffMs);
      }

      // Hostel → Documents timing
      if (student.documentsVerified && times.documents && times.hostel && times.hostel < times.documents) {
        const diffMs = times.documents - times.hostel;
        timingAnalysis.hostelToDocuments.push(diffMs);
      }

      // Documents → Kit timing
      if (student.kitReceived && times.kit && times.documents && times.documents < times.kit) {
        const diffMs = times.kit - times.documents;
        timingAnalysis.documentsToKit.push(diffMs);
      }

      // Overall journey timing (Arrival → Kit)
      if (student.kitReceived && times.kit && times.arrival < times.kit) {
        const diffMs = times.kit - times.arrival;
        timingAnalysis.overallJourney.push(diffMs);
      }
    });

    // Calculate averages and format
    const calculateStats = (timings) => {
      if (timings.length === 0) return { average: "N/A", count: 0, min: "N/A", max: "N/A" };
      
      const avgMs = timings.reduce((a, b) => a + b, 0) / timings.length;
      const minMs = Math.min(...timings);
      const maxMs = Math.max(...timings);

      const formatTime = (ms) => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      };

      return {
        average: formatTime(avgMs),
        count: timings.length,
        min: formatTime(minMs),
        max: formatTime(maxMs),
        averageMinutes: Math.round(avgMs / (1000 * 60))
      };
    };

    const result = {
      totalStudentsAnalyzed: studentsAnalyzed,
      stageTimings: {
        arrivalToHostel: calculateStats(timingAnalysis.arrivalToHostel),
        hostelToDocuments: calculateStats(timingAnalysis.hostelToDocuments),
        documentsToKit: calculateStats(timingAnalysis.documentsToKit),
        overallJourney: calculateStats(timingAnalysis.overallJourney)
      },
      insights: {
        bottleneck: "", // Will be determined below
        averageJourney: calculateStats(timingAnalysis.overallJourney).average,
        completionRate: {
          hostel: timingAnalysis.arrivalToHostel.length / studentsAnalyzed,
          documents: timingAnalysis.hostelToDocuments.length / studentsAnalyzed,
          kit: timingAnalysis.documentsToKit.length / studentsAnalyzed
        }
      }
    };

    // Determine bottleneck stage
    const avgTimes = [
      { stage: "Arrival → Hostel", minutes: result.stageTimings.arrivalToHostel.averageMinutes || 0 },
      { stage: "Hostel → Documents", minutes: result.stageTimings.hostelToDocuments.averageMinutes || 0 },
      { stage: "Documents → Kit", minutes: result.stageTimings.documentsToKit.averageMinutes || 0 }
    ];
    
    const bottleneck = avgTimes.reduce((a, b) => a.minutes > b.minutes ? a : b);
    result.insights.bottleneck = bottleneck.stage;

    logger.api.response("GET", "/api/analytics/stage-timing", 200, {
      totalStudentsAnalyzed: studentsAnalyzed,
      averageJourney: result.insights.averageJourney
    });

    res.json(result);
  } catch (error) {
    logger.api.error("GET", "/api/analytics/stage-timing", error, {});
    res.status(500).json({ error: "Failed to analyze stage timing" });
  }
};

// Get pending students count for each stage
const getPendingCounts = async (req, res) => {
  logger.api.request("GET", "/api/analytics/pending-counts", {});

  try {
    const { data: students, error } = await supabase
      .from("students")
      .select("arrival, hostelVerified, documentsVerified, kitReceived");

    if (error) {
      logger.api.error("GET", "/api/analytics/pending-counts", error, {});
      return res.status(500).json({ error: "Failed to fetch pending data" });
    }

    const pendingCounts = {
      notArrived: 0,
      pendingHostel: 0,
      pendingDocuments: 0,
      pendingKit: 0,
      completed: 0
    };

    students.forEach(student => {
      if (!student.arrival) {
        pendingCounts.notArrived++;
      } else if (!student.hostelVerified) {
        pendingCounts.pendingHostel++;
      } else if (!student.documentsVerified) {
        pendingCounts.pendingDocuments++;
      } else if (!student.kitReceived) {
        pendingCounts.pendingKit++;
      } else {
        pendingCounts.completed++;
      }
    });

    const total = students.length;
    const result = {
      pendingCounts,
      percentages: {
        notArrived: ((pendingCounts.notArrived / total) * 100).toFixed(1),
        pendingHostel: ((pendingCounts.pendingHostel / total) * 100).toFixed(1),
        pendingDocuments: ((pendingCounts.pendingDocuments / total) * 100).toFixed(1),
        pendingKit: ((pendingCounts.pendingKit / total) * 100).toFixed(1),
        completed: ((pendingCounts.completed / total) * 100).toFixed(1)
      },
      totalStudents: total,
      insights: {
        mostBottleneck: Object.entries(pendingCounts)
          .filter(([key]) => key !== 'completed' && key !== 'notArrived')
          .reduce((a, b) => pendingCounts[a[0]] > pendingCounts[b[0]] ? a : b)[0]
      }
    };

    logger.api.response("GET", "/api/analytics/pending-counts", 200, {
      totalStudents: total,
      mostBottleneck: result.insights.mostBottleneck
    });

    res.json(result);
  } catch (error) {
    logger.api.error("GET", "/api/analytics/pending-counts", error, {});
    res.status(500).json({ error: "Failed to analyze pending counts" });
  }
};

module.exports = {
  getStudentJourney,
  getAllStudentJourneys,
  getPeakHours,
  getVolunteerStats,
  getAnalyticsSummary,
  getStageTimingAnalysis,
  getPendingCounts
};
