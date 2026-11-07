const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");

router.post("/driver/register", authController.registerDriver);
router.post("/driver/login", authController.loginDriver);

module.exports = router;