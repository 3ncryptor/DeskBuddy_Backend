const express = require("express");
const router = express.Router();
const {
  scanArrival,
  scanHostel,
  scanDocuments,
  scanKit
} = require("../controllers/scanController");

router.post("/arrival", scanArrival);
router.post("/hostel", scanHostel);
router.post("/documents", scanDocuments);
router.post("/kit", scanKit);

module.exports = router;
