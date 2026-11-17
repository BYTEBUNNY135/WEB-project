
const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const filePath = path.join(__dirname, "../data/bookings.json");

// GET: Fetch all bookings
router.get("/", (req, res) => {
    try {
        const data = fs.readFileSync(filePath, "utf8");
        const bookings = JSON.parse(data);

        res.json({
            success: true,
            bookings: bookings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Could not fetch bookings"
        });
    }
});

// POST: Save a new booking
router.post("/", (req, res) => {
    try {
        const { name, vehicleNumber, slot, date } = req.body;

        if (!name || !vehicleNumber || !slot || !date) {
            return res.status(400).json({
                success: false,
                message: "All booking fields are required"
            });
        }

        const data = fs.readFileSync(filePath, "utf8");
        const bookings = JSON.parse(data);

        const newBooking = {
            id: Date.now().toString(),
            name,
            vehicleNumber,
            slot,
            date
        };

        bookings.push(newBooking);

        fs.writeFileSync(
            filePath,
            JSON.stringify(bookings, null, 2)
        );

        res.status(201).json({
            success: true,
            message: "Booking saved successfully!",
            booking: newBooking
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Could not save booking"
        });
    }
});

module.exports = router;
