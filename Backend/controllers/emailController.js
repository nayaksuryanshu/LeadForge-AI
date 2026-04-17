const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const User = require("../models/User");
const EmailTemplate = require("../models/EmailTemplate");
const SentEmail = require("../models/SentEmail");
const { generateEmailForLead } = require("../services/emailGenerator");
const { sendCampaignEmail } = require("../services/emailSender");
const {
  getDefaultTemplate,
  getTemplates,
  saveDefaultTemplate,
} = require("../services/templateManager");

const getEmailTemplates = async (_req, res) => {
  try {
    const templates = await getTemplates();

    return res.status(200).json({
      success: true,
      count: templates.length,
      templates,
    });
  } catch (error) {
    console.error("Error in getEmailTemplates:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch email templates.",
      error: error.message,
    });
  }
};

const updateEmailTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name, subject, body, description, isDefault } = req.body;

    if (templateId !== "default" && !mongoose.isValidObjectId(templateId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid template id.",
      });
    }

    let template;

    if (templateId === "default") {
      template = await saveDefaultTemplate(
        { name, subject, body, description, isDefault },
        req.user?._id || null
      );
    } else {
      template = await EmailTemplate.findById(templateId);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Template not found.",
        });
      }

      if (typeof name === "string") template.name = name.trim();
      if (typeof subject === "string") template.subject = subject.trim();
      if (typeof body === "string") template.body = body.trim();
      if (typeof description === "string") template.description = description.trim();
      if (typeof isDefault === "boolean") template.isDefault = isDefault;

      await template.save();
    }

    return res.status(200).json({
      success: true,
      message: "Template saved successfully.",
      template,
    });
  } catch (error) {
    console.error("Error in updateEmailTemplate:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save email template.",
      error: error.message,
    });
  }
};

const getSentEmails = async (req, res) => {
  try {
    const { leadId } = req.query;
    const filter = { userId: req.user._id };

    if (leadId) {
      if (!mongoose.isValidObjectId(leadId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid lead id.",
        });
      }

      const ownedLead = await Lead.findOne({ _id: leadId, ownerId: req.user._id }).select("_id");

      if (!ownedLead) {
        return res.status(404).json({
          success: false,
          message: "Lead not found.",
        });
      }

      filter.leadId = ownedLead._id;
    }

    const sentEmails = await SentEmail.find(filter)
      .sort({ sentAt: -1, createdAt: -1 })
      .populate("leadId", "name location email website")
      .populate("templateId", "name subject");

    return res.status(200).json({
      success: true,
      count: sentEmails.length,
      sentEmails,
    });
  } catch (error) {
    console.error("Error in getSentEmails:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sent emails.",
      error: error.message,
    });
  }
};

const resolveEmailContext = async ({ req, leadId, templateId, recipientEmail }) => {
  const lead = await Lead.findOne({ _id: leadId, ownerId: req.user._id });
  if (!lead) {
    return { error: { status: 404, message: "Lead not found." } };
  }

  let resolvedSpeciality = String(req.user?.businessSpeciality || "").trim();

  if (!resolvedSpeciality && req.user?._id) {
    const freshUser = await User.findById(req.user._id).select("businessSpeciality");
    resolvedSpeciality = String(freshUser?.businessSpeciality || "").trim();
  }

  const requestedRecipient = typeof recipientEmail === "string" ? recipientEmail.trim().toLowerCase() : "";
  const emailTo = requestedRecipient || String(lead.email || "").trim().toLowerCase();

  if (!emailTo) {
    return { error: { status: 400, message: "This lead does not have an email address." } };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(emailTo)) {
    return { error: { status: 400, message: "Recipient email is invalid." } };
  }

  if (lead.email !== emailTo) {
    lead.email = emailTo;
    await lead.save();
  }

  let template = null;
  if (templateId && mongoose.isValidObjectId(templateId)) {
    template = await EmailTemplate.findById(templateId);
  }

  if (!template) {
    template = await getDefaultTemplate();
  }

  const specialityPrimarySuggestion = resolvedSpeciality
    ? `Pitch a ${resolvedSpeciality} offer to ${lead.name || "this business"} with one measurable business outcome and a clear next step.`
    : "Use AI to improve first response quality and lead qualification.";

  const analysis = {
    summary: lead.aiAnalysis || "This lead appears to have room for AI-led follow-up.",
    aiGap: lead.aiGap || "No clear AI growth gap was saved yet.",
    suggestions: resolvedSpeciality ? [specialityPrimarySuggestion] : [],
    primarySuggestion: specialityPrimarySuggestion,
    speciality: resolvedSpeciality,
  };

  return {
    lead,
    emailTo,
    template,
    analysis,
    userContext: {
      userName: req.user?.name || "",
      businessSpeciality: resolvedSpeciality,
    },
  };
};

const generateEmailForLeadDraft = async (req, res) => {
  try {
    const requestId = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { leadId } = req.params;
    const { templateId, recipientEmail } = req.body;

    if (!mongoose.isValidObjectId(leadId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead id.",
      });
    }

    const context = await resolveEmailContext({
      req,
      leadId,
      templateId,
      recipientEmail,
    });

    if (context.error) {
      return res.status(context.error.status).json({
        success: false,
        message: context.error.message,
      });
    }

    const generatedEmail = await generateEmailForLead({
      lead: context.lead,
      analysis: context.analysis,
      template: context.template,
      userContext: context.userContext,
    });

    return res.status(200).json({
      success: true,
      requestId,
      message: "Email draft generated successfully.",
      generatedEmail: {
        subject: generatedEmail.subject,
        body: generatedEmail.body,
        source: generatedEmail.source,
      },
      lead: context.lead,
      template: context.template || null,
      recipientEmail: context.emailTo,
    });
  } catch (error) {
    console.error("Error in generateEmailForLeadDraft:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate email draft.",
      error: error.message,
    });
  }
};

const sendEmailToLead = async (req, res) => {
  try {
    const requestId = `email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { leadId } = req.params;
    const { templateId, recipientEmail, subject, body, source } = req.body;

    if (!mongoose.isValidObjectId(leadId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead id.",
      });
    }

    const context = await resolveEmailContext({
      req,
      leadId,
      templateId,
      recipientEmail,
    });

    if (context.error) {
      return res.status(context.error.status).json({
        success: false,
        message: context.error.message,
      });
    }

    console.log(`[sendEmailToLead] requestId=${requestId} leadId=${leadId} recipient=${context.emailTo}`);

    const hasProvidedDraft = String(subject || "").trim() && String(body || "").trim();
    const generatedEmail = hasProvidedDraft
      ? {
          subject: String(subject).trim(),
          body: String(body).trim(),
          source: String(source || "client_draft").trim() || "client_draft",
        }
      : await generateEmailForLead({
          lead: context.lead,
          analysis: context.analysis,
          template: context.template,
          userContext: context.userContext,
        });

    const sentEmail = await SentEmail.create({
      leadId: context.lead._id,
      userId: req.user?._id || null,
      templateId: context.template?._id || null,
      recipientEmail: context.emailTo,
      subject: generatedEmail.subject,
      body: generatedEmail.body,
      status: "pending",
      provider: "nodemailer",
    });

    try {
      const messageInfo = await sendCampaignEmail({
        to: context.emailTo,
        subject: generatedEmail.subject,
        body: generatedEmail.body,
      });

      sentEmail.status = "sent";
      sentEmail.sentAt = new Date();
      sentEmail.providerMessageId = messageInfo?.messageId || "";
      sentEmail.errorMessage = "";
      await sentEmail.save();

      sentEmail.previewUrl = messageInfo?.previewUrl || "";

      return res.status(200).json({
        success: true,
        delivered: true,
        message: "Email sent successfully.",
        requestId,
        email: sentEmail,
        generatedEmail: {
          subject: generatedEmail.subject,
          body: generatedEmail.body,
          source: generatedEmail.source,
        },
        previewUrl: sentEmail.previewUrl || "",
        lead: context.lead,
        template: context.template || null,
      });
    } catch (sendError) {
      sentEmail.status = "failed";
      sentEmail.errorMessage = sendError.message;
      await sentEmail.save();

      return res.status(200).json({
        success: true,
        delivered: false,
        message: `Email draft generated, but sending failed: ${sendError.message}`,
        requestId,
        email: sentEmail,
        generatedEmail: {
          subject: generatedEmail.subject,
          body: generatedEmail.body,
          source: generatedEmail.source,
        },
        previewUrl: "",
        lead: context.lead,
        template: context.template || null,
      });
    }
  } catch (error) {
    console.error("Error in sendEmailToLead:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate or send email.",
      error: error.message,
    });
  }
};

module.exports = {
  getEmailTemplates,
  updateEmailTemplate,
  getSentEmails,
  generateEmailForLeadDraft,
  sendEmailToLead,
};
