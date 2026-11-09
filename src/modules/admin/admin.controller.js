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