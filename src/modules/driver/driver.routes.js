
const express = require("express");
const router = express.Router();

const {
  getDriverProfile,
  saveDriverProfile,
  updateDriverProfile,
} = require("./driver.controller");

const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");

const uploadDriverImages = require("./upload.middleware");

// Get logged-in driver's profile
router.get(
  "/me",
  authenticate,
  authorize("driver"),
  getDriverProfile
);

// Save initial driver profile and vehicle photographs
router.post(
  "/profile",
  authenticate,
  authorize("driver"),
  uploadDriverImages,
  saveDriverProfile
);

// Update driver profile and optionally replace photographs
router.put(
  "/profile",
  authenticate,
  authorize("driver"),
  uploadDriverImages,
  updateDriverProfile
);

module.exports = router;
