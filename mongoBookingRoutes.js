
const express = require("express");
const router = express.Router();

const Booking = require("../models/Booking");

// CREATE: Add a booking
router.post("/", async (req, res) => {
    try {
        const { name, vehicleNumber, slot, date } = req.body;

        if (!name || !vehicleNumber || !slot || !date) {
            return res.status(400).json({
                success: false,
                message: "All booking fields are required"
            });
        }

        const booking = await Booking.create({
            name,
            vehicleNumber,
            slot,
            date
        });

        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            booking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// READ: Get all bookings
router.get("/", async (req, res) => {
    try {
        const bookings = await Booking.find();

        res.json({
            success: true,
            bookings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// UPDATE: Update a booking
router.put("/:id", async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        res.json({
            success: true,
            message: "Booking updated successfully",
            booking
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// DELETE: Delete a booking
router.delete("/:id", async (req, res) => {
    try {
        const booking = await Booking.findByIdAndDelete(
            req.params.id
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        res.json({
            success: true,
            message: "Booking deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
