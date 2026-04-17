const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    website: {
      type: String,
      trim: true,
      default: "",
    },
    scrapeQuery: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "lost"],
      default: "new",
    },
    aiAnalysis: {
      type: String,
      trim: true,
      default: "",
    },
    aiGap: {
      type: String,
      trim: true,
      default: "",
    },
    lastAnalyzed: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ ownerId: 1, name: 1, location: 1, scrapeQuery: 1 }, { unique: true });

module.exports = mongoose.model("Lead", leadSchema);
