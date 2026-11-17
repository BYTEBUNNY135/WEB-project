
const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

// CREATE: Save booking in MongoDB
router.post("/", async (req, res) => {
    try {
        const { name, email, slot, date, space, total } = req.body;

        if (!name || !email || !slot || !date || !space || total === undefined) {
            return res.status(400).json({
                success: false,
                error: "All booking fields are required"
            });
        }

        const booking = await Booking.create({
            name,
            email,
            slot,
            date,
            space,
            total
        });

        res.status(201).json({
            success: true,
            message: "Booking saved successfully",
            booking: {
                id: booking._id,
                name: booking.name,
                email: booking.email,
                slot: booking.slot,
                date: booking.date,
                space: booking.space,
                total: booking.total,
                checkin: "09:00",
                checkout: "13:00"
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
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
            error: error.message
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
                error: "Booking not found"
            });
        }

        res.json({ success: true, booking });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// DELETE: Delete a booking
router.delete("/:id", async (req, res) => {
    try {
        const booking = await Booking.findByIdAndDelete(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: "Booking not found"
            });
        }

        res.json({
            success: true,
            message: "Booking deleted successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;

