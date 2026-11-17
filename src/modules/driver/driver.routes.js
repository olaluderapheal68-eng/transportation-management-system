
const express = require("express");
const router = express.Router();

const {
  getDriverProfile,
  saveDriverProfile,
  updateDriverProfile,
  submitDriverDocuments,
  getDriverDocuments,
} = require("./driver.controller");

const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");

const uploadDriverImages = require("./upload.middleware");
const uploadDriverDocuments = require("./document-upload.middleware");

// GET /api/driver/me
router.get(
  "/me",
  authenticate,
  authorize("driver"),
  getDriverProfile
);

// POST /api/driver/profile
router.post(
  "/profile",
  authenticate,
  authorize("driver"),
  uploadDriverImages,
  saveDriverProfile
);

// PUT /api/driver/profile
router.put(
  "/profile",
  authenticate,
  authorize("driver"),
  uploadDriverImages,
  updateDriverProfile
);

// POST /api/driver/documents
router.post(
  "/documents",
  authenticate,
  authorize("driver"),
  uploadDriverDocuments,
  submitDriverDocuments
);

// GET /api/driver/documents
router.get(
  "/documents",
  authenticate,
  authorize("driver"),
  getDriverDocuments
);

module.exports = router;
