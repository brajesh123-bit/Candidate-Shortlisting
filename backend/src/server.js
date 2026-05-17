import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { getStorageMode } from "./data/candidateRepository.js";
import candidateRoutes from "./routes/candidates.js";
import matchingRoutes from "./routes/matching.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
const envPath = path.resolve(__dirname, "../.env");

dotenv.config({ path: envPath });

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", storageMode: getStorageMode() });
});

app.use("/api/candidates", candidateRoutes);
app.use("/api", matchingRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(frontendDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.use((error, _req, res, _next) => {
  if (error?.code === 11000) {
    return res.status(409).json({ message: "A candidate with this email already exists." });
  }

  res.status(500).json({
    message: error.message || "Internal server error",
  });
});

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn("MONGODB_URI not set. Starting with in-memory candidate storage.");
    return;
  }

  await mongoose.connect(mongoUri);
};

connectDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on port ${port} using ${getStorageMode()} storage`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed. Falling back to in-memory storage.", error.message);
    app.listen(port, () => {
      console.log(`Server listening on port ${port} using ${getStorageMode()} storage`);
    });
  });
