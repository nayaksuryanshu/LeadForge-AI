const express = require("express");
const { protect, allowRoles } = require("../middleware/authMiddleware");
const { validateLeadId, validateNote } = require("../middleware/validation");
const { getNotesByLeadId, addNote } = require("../controllers/noteController");

const router = express.Router();

router.get(
  "/:leadId",
  protect,
  allowRoles("admin", "manager", "user"),
  validateLeadId("leadId"),
  getNotesByLeadId
);

router.post(
  "/:leadId",
  protect,
  allowRoles("admin", "manager", "user"),
  validateLeadId("leadId"),
  validateNote,
  addNote
);

module.exports = router;
