
const express = require("express");
const router = express.Router();

const ParkingSpace = require("../models/parkingspace");

// Publish a parking space
router.post("/publish", async (req, res) => {
  try {
    const { title, address, type, price, email } = req.body;

    if (!title || !address || !type || !email || Number(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all parking space details."
      });
    }

    const parkingSpace = new ParkingSpace({
      title,
      address,
      type,
      price: Number(price),
      email: email.toLowerCase().trim()
    });

    await parkingSpace.save();

    return res.status(201).json({
      success: true,
      message: "Parking space published successfully!",
      listing: parkingSpace
    });

  } catch (error) {
    console.error("Host publish error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to publish parking space."
    });
  }
});

// Get all parking spaces
router.get("/", async (req, res) => {
  try {
    const spaces = await ParkingSpace.find().sort({ createdAt: -1 });

    return res.json({
      success: true,
      spaces
    });

  } catch (error) {
    console.error("Fetch parking spaces error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch parking spaces."
    });
  }
});

// Get parking spaces belonging to one host
router.get("/my-spaces", async (req, res) => {
  try {
    const email = req.query.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required."
      });
    }

    const spaces = await ParkingSpace.find({
      email: email.toLowerCase().trim()
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      spaces
    });

  } catch (error) {
    console.error("Fetch host listings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your listings."
    });
  }
});

module.exports = router;
