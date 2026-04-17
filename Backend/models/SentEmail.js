const mongoose = require("mongoose");

const sentEmailSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailTemplate",
      default: null,
    },
    recipientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    provider: {
      type: String,
      trim: true,
      default: "nodemailer",
    },
    providerMessageId: {
      type: String,
      trim: true,
      default: "",
    },
    errorMessage: {
      type: String,
      trim: true,
      default: "",
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

sentEmailSchema.index({ leadId: 1, sentAt: -1 });

module.exports = mongoose.model("SentEmail", sentEmailSchema);
