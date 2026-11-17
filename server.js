
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const bookingRoutes = require("./routes/bookingRoutes");
const mongoBookingRoutes = require("./routes/mongoBookingRoutes");
const authRoutes = require("./routes/authRoutes");
const hostRoutes = require("./routes/hostRoutes");

app.use("/api/bookings", bookingRoutes);
app.use("/api/mongo-bookings", mongoBookingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/host", hostRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "PARK-O-BUDDY backend is running."
  });
});

// Start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
