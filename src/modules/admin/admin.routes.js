const express = require("express");
const router = express.Router();

const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");

const adminController = require("./admin.controller");

router.get(
  "/profile",
  authenticate,
  authorize("admin"),
  adminController.getAdminProfile
);

module.exports = router;