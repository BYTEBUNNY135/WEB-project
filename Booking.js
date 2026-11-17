const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    vehicleNumber: {
        type: String,
        required: true
    },
    slot: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model("Booking", bookingSchema);