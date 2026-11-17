
const express = require("express");
const router = express.Router();

const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");

const adminController = require("./admin.controller");

// All routes below require an authenticated administrator
router.use(authenticate, authorize("admin"));

// GET /api/admin/profile
router.get(
  "/profile",
  adminController.getAdminProfile
);

// GET /api/admin/drivers/pending
// Must appear before /drivers/:driverId
router.get(
  "/drivers/pending",
  adminController.getPendingDrivers
);

// GET /api/admin/drivers/:driverId
router.get(
  "/drivers/:driverId",
  adminController.getDriverVerificationDetails
);

// PATCH /api/admin/drivers/:driverId/documents/:documentId/review
router.patch(
  "/drivers/:driverId/documents/:documentId/review",
  adminController.reviewDriverDocument
);

// PATCH /api/admin/drivers/:driverId/verification
router.patch(
  "/drivers/:driverId/verification",
  adminController.reviewDriverVerification
);

module.exports = router;
