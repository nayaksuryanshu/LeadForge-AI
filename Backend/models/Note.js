const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    note: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
  },
  {
    timestamps: true,
  }
);

noteSchema.index({ leadId: 1, createdAt: -1 });

module.exports = mongoose.model("Note", noteSchema);
