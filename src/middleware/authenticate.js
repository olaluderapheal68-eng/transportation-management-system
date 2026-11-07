const { getSupabase } = require("../config/supabase");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const { data, error } = await getSupabase().auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired access token.",
      });
    }

    req.user = data.user;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;