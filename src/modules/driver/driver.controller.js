exports.getDriverProfile = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Driver authentication verified.",
    driver: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.app_metadata?.role,
    },
  });
};