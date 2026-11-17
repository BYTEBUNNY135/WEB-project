const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const bookingRoutes = require("./bookingRoutes");
app.use("/api/bookings", bookingRoutes);

const mongoBookingRoutes = require("./mongoBookingRoutes");
app.use("/api/mongo-bookings", mongoBookingRoutes);


// Test API
app.get("/", (req, res) => {
    res.send("PARK-O-BUDDY Backend is Running!");
});

// Health check API
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Backend connected successfully!"
    });
});

// Start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully!");

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error.message);
    });
