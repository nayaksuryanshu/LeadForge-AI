const express = require("express");
const { startScraper } = require("../controllers/scraperController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/start", protect, startScraper);

module.exports = router;
