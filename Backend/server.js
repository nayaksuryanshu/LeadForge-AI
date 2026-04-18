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

const normalizeOrigin = (value) => String(value || "").trim().replace(/\/+$/, "");

const envAllowedOrigins = String(process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const fallbackAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const allowedOrigins = new Set([...envAllowedOrigins, ...fallbackAllowedOrigins]);

const isAllowedOrigin = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin);

  if (!normalizedOrigin) {
    return true;
  }

  if (allowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  try {
    const { hostname } = new URL(normalizedOrigin);

    // Allow Vercel deployment and preview domains.
    if (hostname === "vercel.app" || hostname.endsWith(".vercel.app")) {
      return true;
    }
  } catch (_error) {
    return false;
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS blocked for this origin"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
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
