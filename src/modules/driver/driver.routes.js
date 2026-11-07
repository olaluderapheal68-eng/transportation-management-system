const express = require("express");
const router = express.Router();

const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");

const driverController = require("./driver.controller");

router.get(
  "/me",
  authenticate,
  authorize("driver"),
  driverController.getDriverProfile
);

module.exports = router;