const authService = require("./auth.service");

exports.registerDriver = async (req, res, next) => {
  try {
    const result = await authService.registerDriver(req.body);

    res.status(201).json({
      success: true,
      message: result.requiresEmailConfirmation
        ? "Registration successful. Confirm your email before logging in."
        : "Registration successful. Please log in to obtain your access token.",
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.user_metadata?.full_name,
        role: result.user.app_metadata?.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.loginDriver = async (req, res, next) => {
  try {
    const result = await authService.loginDriver(req.body);

    res.status(200).json({
      success: true,
      message: "Driver login successful.",
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.app_metadata?.role,
      },
      session: {
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
        expires_in: result.session.expires_in,
      },
    });
  } catch (error) {
    next(error);
  }
};