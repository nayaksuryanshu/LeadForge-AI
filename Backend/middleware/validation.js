const mongoose = require("mongoose");

const allowedStatuses = ["new", "contacted", "qualified", "lost"];

const validateLeadId = (paramName = "id") => (req, res, next) => {
  const value = req.params[paramName];

  if (!mongoose.isValidObjectId(value)) {
    return res.status(400).json({
      success: false,
      message: "Invalid lead id.",
    });
  }

  return next();
};

const validateLeadUpdate = (req, res, next) => {
  const { status } = req.body;

  if (typeof status === "string" && status.trim()) {
    const normalizedStatus = status.trim().toLowerCase();

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
      });
    }

    req.body.status = normalizedStatus;
  }

  return next();
};

const validateNote = (req, res, next) => {
  const note = String(req.body.note || "").trim();

  if (!note) {
    return res.status(400).json({
      success: false,
      message: "Note cannot be empty.",
    });
  }

  req.body.note = note;
  return next();
};

module.exports = {
  validateLeadId,
  validateLeadUpdate,
  validateNote,
};
