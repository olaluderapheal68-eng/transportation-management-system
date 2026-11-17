
const adminService = require("./admin.service");

// GET /api/admin/profile
exports.getAdminProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin access verified successfully.",
    admin: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.app_metadata?.role,
    },
  });
};

// GET /api/admin/drivers/pending
exports.getPendingDrivers = async (req, res, next) => {
  try {
    const result = await adminService.getPendingDrivers();

    return res.status(200).json({
      success: true,
      message: "Pending drivers retrieved successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/drivers/:driverId
exports.getDriverVerificationDetails = async (req, res, next) => {
  try {
    const result = await adminService.getDriverVerificationDetails(
      req.params.driverId
    );

    return res.status(200).json({
      success: true,
      message: "Driver verification details retrieved successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/drivers/:driverId/documents/:documentId/review
exports.reviewDriverDocument = async (req, res, next) => {
  try {
    const result = await adminService.reviewDriverDocument({
      driverId: req.params.driverId,
      documentId: req.params.documentId,
      adminId: req.user.id,
      status: req.body.status,
      reviewNotes: req.body.reviewNotes,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/drivers/:driverId/verification
exports.reviewDriverVerification = async (req, res, next) => {
  try {
    const result = await adminService.reviewDriverVerification({
      driverId: req.params.driverId,
      adminId: req.user.id,
      status: req.body.status,
      reviewNotes: req.body.reviewNotes,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
