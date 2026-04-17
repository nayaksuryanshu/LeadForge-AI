const express = require("express");
const { protect, allowRoles } = require("../middleware/authMiddleware");
const { validateLeadId } = require("../middleware/validation");
const { analyzeLeadWebsite } = require("../controllers/aiController");

const router = express.Router();

router.post(
  "/analyze/:leadId",
  protect,
  allowRoles("admin", "manager", "user"),
  validateLeadId("leadId"),
  analyzeLeadWebsite
);

module.exports = router;
