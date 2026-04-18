const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const Note = require("../models/Note");
const SentEmail = require("../models/SentEmail");
const { sanitizeLeadPhone } = require("../utils/phoneSanitizer");

const getLeads = async (req, res) => {
  try {
    const rawQuery = typeof req.query.scrapeQuery === "string" ? req.query.scrapeQuery : "";
    const scrapeQuery = rawQuery.trim();
    const filter = {
      ownerId: req.user._id,
      ...(scrapeQuery ? { scrapeQuery } : {}),
    };

    const leads = await Lead.find(filter).sort({ createdAt: -1 });
    const normalizedLeads = leads.map((lead) => {
      const jsonLead = lead.toObject();
      jsonLead.phone = sanitizeLeadPhone(jsonLead.phone);
      return jsonLead;
    });
    const availableQueries = await Lead.distinct("scrapeQuery", {
      ownerId: req.user._id,
      scrapeQuery: { $ne: "" },
    });

    return res.status(200).json({
      success: true,
      count: normalizedLeads.length,
      selectedQuery: scrapeQuery,
      availableQueries: availableQueries.sort((a, b) => b.localeCompare(a)),
      leads: normalizedLeads,
    });
  } catch (error) {
    console.error("Error in getLeads:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch leads.",
      error: error.message,
    });
  }
};

const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead id.",
      });
    }

    const lead = await Lead.findOne({ _id: id, ownerId: req.user._id });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    const notes = await Note.find({ leadId: id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      lead: {
        ...lead.toObject(),
        phone: sanitizeLeadPhone(lead.phone),
      },
      notes,
    });
  } catch (error) {
    console.error("Error in getLeadById:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch lead details.",
      error: error.message,
    });
  }
};

const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, phone, email, website, status, aiAnalysis, aiGap, lastAnalyzed } = req.body;
    const updates = {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead id.",
      });
    }

    if (typeof name === "string") updates.name = name.trim();
    if (typeof location === "string") updates.location = location.trim();
    if (typeof phone === "string") updates.phone = sanitizeLeadPhone(phone);
    if (typeof email === "string") updates.email = email.trim().toLowerCase();
    if (typeof website === "string") updates.website = website.trim();
    if (typeof status === "string") updates.status = status.trim().toLowerCase();
    if (typeof aiAnalysis === "string") updates.aiAnalysis = aiAnalysis.trim();
    if (typeof aiGap === "string") updates.aiGap = aiGap.trim();
    if (lastAnalyzed) updates.lastAnalyzed = new Date(lastAnalyzed);

    const lead = await Lead.findOneAndUpdate({ _id: id, ownerId: req.user._id }, updates, {
      new: true,
      runValidators: true,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully.",
      lead: {
        ...lead.toObject(),
        phone: sanitizeLeadPhone(lead.phone),
      },
    });
  } catch (error) {
    console.error("Error in updateLead:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update lead.",
      error: error.message,
    });
  }
};

const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead id.",
      });
    }

    const deletedLead = await Lead.findOneAndDelete({ _id: id, ownerId: req.user._id });

    if (!deletedLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    await Promise.all([
      Note.deleteMany({ leadId: deletedLead._id }),
      SentEmail.deleteMany({ leadId: deletedLead._id }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Lead deleted successfully.",
      deletedLeadId: String(deletedLead._id),
    });
  } catch (error) {
    console.error("Error in deleteLead:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete lead.",
      error: error.message,
    });
  }
};

const deleteLeadsByQuery = async (req, res) => {
  try {
    const rawScrapeQuery = typeof req.params.scrapeQuery === "string" ? req.params.scrapeQuery : "";
    const scrapeQuery = rawScrapeQuery.trim();

    if (!scrapeQuery) {
      return res.status(400).json({
        success: false,
        message: "A valid scrape query is required.",
      });
    }

    const leadsToDelete = await Lead.find({ ownerId: req.user._id, scrapeQuery }).select("_id");
    const leadIds = leadsToDelete.map((lead) => lead._id);

    if (leadIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No leads found for this query.",
      });
    }

    await Promise.all([
      Lead.deleteMany({ _id: { $in: leadIds } }),
      Note.deleteMany({ leadId: { $in: leadIds } }),
      SentEmail.deleteMany({ leadId: { $in: leadIds } }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Leads for query deleted successfully.",
      deletedCount: leadIds.length,
      scrapeQuery,
    });
  } catch (error) {
    console.error("Error in deleteLeadsByQuery:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete leads by query.",
      error: error.message,
    });
  }
};

module.exports = {
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  deleteLeadsByQuery,
};
