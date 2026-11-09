
const authService = require("./auth.service");

// DRIVER REGISTRATION
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

// DRIVER LOGIN
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

// REQUEST PASSWORD RESET
exports.forgotDriverPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotDriverPassword(req.body);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// SET NEW PASSWORD
exports.resetDriverPassword = async (req, res, next) => {
  try {
    const result = await authService.resetDriverPassword(req.body);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN LOGIN
// ADMIN LOGIN
exports.loginAdmin = async (req, res, next) => {
  try {
    const result = await authService.loginAdmin(req.body);

    res.status(200).json({
      success: true,
      message: "Admin login successful.",
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

// REQUEST ADMIN PASSWORD RESET
exports.forgotAdminPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotAdminPassword(req.body);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// SET NEW ADMIN PASSWORD
exports.resetAdminPassword = async (req, res, next) => {
  try {
    const result = await authService.resetAdminPassword(req.body);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};


// ADMIN LOGOUT
exports.logoutAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    const result = await authService.logoutAdmin(accessToken);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
