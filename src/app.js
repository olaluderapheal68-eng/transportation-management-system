const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/auth/auth.routes");
const driverRoutes = require("./modules/driver/driver.routes");

const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Easy Transit Backend is running.",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/driver", driverRoutes);

app.use(errorHandler);

module.exports = app;