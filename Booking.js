
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
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
    },
    space: {
        type: String,
        required: true
    },
    total: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model("Booking", bookingSchema);
