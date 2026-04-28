import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
import SessionRoutes from "./routes/SessionRoutes.js";

// Initialize the app
const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB ||
  "mongodb://127.0.0.1:27017/atendo";
const MONGODB_FALLBACK =
  process.env.MONGODB_LOCAL ||
  "mongodb://127.0.0.1:27017/atendo";

function startServer() {
  // Routes
  app.use("/users", userRoutes);
  app.use("/sessions", SessionRoutes);

  // Global error handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

function connectToDB(uri) {
  return mongoose.connect(uri, mongooseOptions);
}
// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.static("public"));
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
// Connect to MongoDB and start server only after successful connection
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
};

connectToDB(MONGODB_URI)
  .then(() => {
    console.log("Database Connected", MONGODB_URI);
    startServer();
  })
  .catch((err) => {
    console.error("Atlas MongoDB connection failed:", err.message || err);
    if (MONGODB_URI !== MONGODB_FALLBACK) {
      console.log("Attempting fallback local MongoDB...");
      connectToDB(MONGODB_FALLBACK)
        .then(() => {
          console.log("Fallback Database Connected", MONGODB_FALLBACK);
          startServer();
        })
        .catch((fallbackErr) => {
          console.error("Fallback MongoDB connection failed:", fallbackErr.message || fallbackErr);
          process.exit(1);
        });
    } else {
      console.error("No alternative MongoDB configured. Exiting.");
      process.exit(1);
    }
  });
