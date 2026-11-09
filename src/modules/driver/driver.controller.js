
const {
  createDriverProfile,
  updateDriverProfile,
  getDriverProfileDetails,
} = require("./driver.service");

// GET /api/driver/me
exports.getDriverProfile = async (req, res, next) => {
  try {
    const driver = await getDriverProfileDetails(req.user.id);

    driver.email = req.user.email;
    driver.role = req.user.app_metadata?.role;

    res.status(200).json({
      success: true,
      message: "Driver profile retrieved successfully.",
      driver,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/driver/profile
exports.saveDriverProfile = async (req, res, next) => {
  try {
    const result = await createDriverProfile(
      req.user.id,
      req.body,
      req.files
    );

    res.status(201).json({
      success: true,
      message: result.message,
      vehicle: result.vehicle,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/driver/profile
exports.updateDriverProfile = async (req, res, next) => {
  try {
    const result = await updateDriverProfile(
      req.user.id,
      req.body,
      req.files
    );

    res.status(200).json({
      success: true,
      message: result.message,
      vehicle: result.vehicle,
    });
  } catch (error) {
    next(error);
  }
};
