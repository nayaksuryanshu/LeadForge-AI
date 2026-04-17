const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const User = require("../models/User");
const { scrapeWebsiteContent } = require("../services/websiteScraper");
const { analyzeWebsiteForLead } = require("../services/aiAnalyzer");

const analyzeLeadWebsite = async (req, res) => {
  try {
    const { leadId } = req.params;

    if (!mongoose.isValidObjectId(leadId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead id.",
      });
    }

    const lead = await Lead.findOne({ _id: leadId, ownerId: req.user._id });
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    let resolvedSpeciality = String(req.user?.businessSpeciality || "").trim();

    if (!resolvedSpeciality && req.user?._id) {
      const freshUser = await User.findById(req.user._id).select("businessSpeciality");
      resolvedSpeciality = String(freshUser?.businessSpeciality || "").trim();
    }

    const websiteSnapshot = await scrapeWebsiteContent(lead.website);
    const analysis = await analyzeWebsiteForLead({
      lead,
      websiteSnapshot,
      userContext: {
        businessSpeciality: resolvedSpeciality,
        userName: req.user?.name || "",
      },
    });

    const composedSummary = String(analysis.summary || "").trim();

    lead.aiAnalysis = composedSummary;
    lead.aiGap = analysis.aiGap || "";
    lead.lastAnalyzed = new Date();

    await lead.save();

    return res.status(200).json({
      success: true,
      message: "Lead analyzed successfully.",
      lead,
      analysis: {
        summary: analysis.summary,
        aiGap: analysis.aiGap,
        suggestions: analysis.suggestions || [],
        source: analysis.source,
        context: {
          businessSpeciality: resolvedSpeciality,
        },
      },
      websiteSnapshot,
    });
  } catch (error) {
    console.error("Error in analyzeLeadWebsite:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to analyze lead website.",
      error: error.message,
    });
  }
};

module.exports = {
  analyzeLeadWebsite,
};
