const express = require("express");
const { protect, allowRoles } = require("../middleware/authMiddleware");
const { validateLeadId, validateLeadUpdate } = require("../middleware/validation");
const {
	getLeads,
	getLeadById,
	updateLead,
	deleteLead,
	deleteLeadsByQuery,
} = require("../controllers/leadController");

const router = express.Router();

router.get("/", protect, allowRoles("admin", "manager", "user"), getLeads);
router.delete(
	"/query/:scrapeQuery",
	protect,
	allowRoles("admin", "manager", "user"),
	deleteLeadsByQuery
);
router.get("/:id", protect, allowRoles("admin", "manager", "user"), validateLeadId("id"), getLeadById);
router.patch("/:id", protect, allowRoles("admin", "manager", "user"), validateLeadId("id"), validateLeadUpdate, updateLead);
router.delete("/:id", protect, allowRoles("admin", "manager", "user"), validateLeadId("id"), deleteLead);

module.exports = router;
