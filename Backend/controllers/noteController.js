const mongoose = require("mongoose");
const Note = require("../models/Note");
const Lead = require("../models/Lead");

const getNotesByLeadId = async (req, res) => {
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

    const notes = await Note.find({ leadId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    console.error("Error in getNotesByLeadId:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notes.",
      error: error.message,
    });
  }
};

const addNote = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { note } = req.body;

    if (!mongoose.isValidObjectId(leadId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead id.",
      });
    }

    const trimmedNote = String(note || "").trim();
    if (!trimmedNote) {
      return res.status(400).json({
        success: false,
        message: "Note cannot be empty.",
      });
    }

    const lead = await Lead.findOne({ _id: leadId, ownerId: req.user._id });
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    const createdNote = await Note.create({
      leadId,
      note: trimmedNote,
    });

    return res.status(201).json({
      success: true,
      message: "Note added successfully.",
      note: createdNote,
    });
  } catch (error) {
    console.error("Error in addNote:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add note.",
      error: error.message,
    });
  }
};

module.exports = {
  getNotesByLeadId,
  addNote,
};
