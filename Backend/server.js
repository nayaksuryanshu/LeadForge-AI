require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const scraperRoutes = require("./routes/scraperRoutes");
const leadRoutes = require("./routes/leadRoutes");
const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");
const emailRoutes = require("./routes/emailRoutes");
const Lead = require("./models/Lead");
const Note = require("./models/Note");
const EmailTemplate = require("./models/EmailTemplate");
const SentEmail = require("./models/SentEmail");
const noteRoutes = require("./routes/noteRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = String(process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser tools (no Origin header) and allow all if no FRONTEND_ORIGIN is set.
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS blocked for this origin"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({ message: "LeadForge backend is running." });
});

app.use("/api/auth", authRoutes);
app.use("/api/scraper", scraperRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/email", emailRoutes);

const startServer = async () => {
  try {
    await connectDB();
    await Lead.syncIndexes();
    await Note.syncIndexes();
    await EmailTemplate.syncIndexes();
    await SentEmail.syncIndexes();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
