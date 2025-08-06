const express = require("express");
const router = express.Router();
const {
  scanArrival,
  scanHostel,
  scanDocuments,
  scanKit,
  updateVisitorCount
} = require("../controllers/scanController");
const paymentService = require("../services/paymentService");

router.post("/arrival", scanArrival);
router.post("/arrival/visitors", updateVisitorCount);
router.post("/hostel", scanHostel);
router.post("/documents", scanDocuments);
router.post("/kit", scanKit);

router.get("/payment/:studentId", async (req, res) => {
  const { studentId } = req.params;
  
  const result = await paymentService.getPaymentData(studentId);
  
  if (result.success) {
    res.json({ 
      dueAmount: result.dueAmount,
      success: true 
    });
  } else {
    res.status(500).json({ 
      error: 'Error fetching payment data', 
      details: result.error,
      success: false 
    });
  }
});

module.exports = router;
