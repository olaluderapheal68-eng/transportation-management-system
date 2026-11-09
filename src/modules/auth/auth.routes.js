const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");

const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");

// DRIVER ROUTES
router.post("/driver/register", authController.registerDriver);
router.post("/driver/login", authController.loginDriver);

router.post(
  "/driver/forgot-password",
  authController.forgotDriverPassword
);

router.post(
  "/driver/reset-password",
  authController.resetDriverPassword
);

// ADMIN ROUTES
router.post("/admin/login", authController.loginAdmin);

router.post(
  "/admin/forgot-password",
  authController.forgotAdminPassword
);

router.post(
  "/admin/reset-password",
  authController.resetAdminPassword
);

router.post(
  "/admin/logout",
  authenticate,
  authorize("admin"),
  authController.logoutAdmin
);
module.exports = router;
