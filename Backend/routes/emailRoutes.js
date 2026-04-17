const express = require("express");
const { protect, allowRoles } = require("../middleware/authMiddleware");
const { validateLeadId } = require("../middleware/validation");
const {
  getEmailTemplates,
  updateEmailTemplate,
  getSentEmails,
  generateEmailForLeadDraft,
  sendEmailToLead,
} = require("../controllers/emailController");

const router = express.Router();

router.get("/templates", protect, allowRoles("admin", "manager", "user"), getEmailTemplates);
router.put(
  "/templates/:templateId",
  protect,
  allowRoles("admin", "manager", "user"),
  updateEmailTemplate
);
router.get("/sent-emails", protect, allowRoles("admin", "manager", "user"), getSentEmails);
router.post(
  "/generate-email/:leadId",
  protect,
  allowRoles("admin", "manager", "user"),
  validateLeadId("leadId"),
  generateEmailForLeadDraft
);
router.post(
  "/send-email/:leadId",
  protect,
  allowRoles("admin", "manager", "user"),
  validateLeadId("leadId"),
  sendEmailToLead
);

module.exports = router;
