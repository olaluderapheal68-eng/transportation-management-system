const { createClient } = require("@supabase/supabase-js");

const {
  getSupabase,
  getSupabaseAdmin,
} = require("../../config/supabase");

// DRIVER REGISTRATION
exports.registerDriver = async ({ fullName, email, password }) => {
  if (!fullName || !email || !password) {
    const error = new Error(
      "Full name, email and password are required."
    );
    error.status = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error(
      "Password must contain at least 8 characters."
    );
    error.status = 400;
    throw error;
  }

  const supabase = getSupabase();
  const admin = getSupabaseAdmin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: "http://localhost:5000",
    },
  });

  if (error) throw error;

  if (!data.user) {
    throw new Error("Driver registration could not be completed.");
  }

  const { data: updatedData, error: roleError } =
    await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: {
        ...data.user.app_metadata,
        role: "driver",
      },
    });

  if (roleError) throw roleError;

  return {
    user: updatedData.user,
    requiresEmailConfirmation: !data.session,
  };
};

// DRIVER LOGIN
exports.loginDriver = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error("Email and password are required.");
    error.status = 400;
    throw error;
  }

  const supabase = getSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  if (data.user.app_metadata?.role !== "driver") {
    const error = new Error(
      "This account is not registered as a driver."
    );
    error.status = 403;
    throw error;
  }

  return data;
};

// REQUEST DRIVER PASSWORD RESET
exports.forgotDriverPassword = async ({ email }) => {
  if (!email || !email.trim()) {
    const error = new Error("Email address is required.");
    error.status = 400;
    throw error;
  }

  const supabase = getSupabase();

  const redirectTo =
    process.env.DRIVER_PASSWORD_RESET_REDIRECT_URL;

  if (!redirectTo) {
    throw new Error(
      "Password reset redirect URL is not configured."
    );
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim(),
    {
      redirectTo,
    }
  );

  if (error) throw error;

  // Use the same response whether or not the account exists.
  return {
    message:
      "If an account exists with that email, a password reset link will be sent.",
  };
};

// SET A NEW DRIVER PASSWORD
exports.resetDriverPassword = async ({
  accessToken,
  newPassword,
}) => {
  if (!accessToken || !newPassword) {
    const error = new Error(
      "Recovery token and new password are required."
    );
    error.status = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error(
      "New password must contain at least 8 characters."
    );
    error.status = 400;
    throw error;
  }

  const supabase = getSupabase();
  const admin = getSupabaseAdmin();

  // Verify the recovery session token with Supabase
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    const invalidError = new Error(
      "Invalid or expired password reset session. Request a new reset link."
    );
    invalidError.status = 401;
    throw invalidError;
  }

  // Only driver accounts can use this driver password reset endpoint
  if (data.user.app_metadata?.role !== "driver") {
    const roleError = new Error(
      "This account is not registered as a driver."
    );
    roleError.status = 403;
    throw roleError;
  }

  // Update password securely using the server-side admin client
  const { error: updateError } =
    await admin.auth.admin.updateUserById(data.user.id, {
      password: newPassword,
    });

  if (updateError) throw updateError;

  return {
    message: "Password updated successfully. You can now log in with your new password.",
  };
};

// ADMIN LOGIN
exports.loginAdmin = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error("Email and password are required.");
    error.status = 400;
    throw error;
  }

  const supabase = getSupabase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  if (data.user.app_metadata?.role !== "admin") {
    const error = new Error(
      "You are not authorized to access the admin portal."
    );
    error.status = 403;
    throw error;
  }

  return data;
};

// REQUEST ADMIN PASSWORD RESET
exports.forgotAdminPassword = async ({ email }) => {
  if (!email || !email.trim()) {
    const error = new Error("Email address is required.");
    error.status = 400;
    throw error;
  }

  const supabase = getSupabase();

  const redirectTo =
    process.env.ADMIN_PASSWORD_RESET_REDIRECT_URL;

  if (!redirectTo) {
    throw new Error(
      "Admin password reset redirect URL is not configured."
    );
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim(),
    {
      redirectTo,
    }
  );

  if (error) throw error;

  return {
    message:
      "If an admin account exists with that email, a password reset link will be sent.",
  };
};

// RESET ADMIN PASSWORD
exports.resetAdminPassword = async ({
  accessToken,
  newPassword,
}) => {
  if (!accessToken || !newPassword) {
    const error = new Error(
      "Recovery token and new password are required."
    );
    error.status = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error(
      "New password must contain at least 8 characters."
    );
    error.status = 400;
    throw error;
  }

  const supabase = getSupabase();
  const admin = getSupabaseAdmin();

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    const invalidError = new Error(
      "Invalid or expired password reset session. Request a new reset link."
    );
    invalidError.status = 401;
    throw invalidError;
  }

  if (data.user.app_metadata?.role !== "admin") {
    const roleError = new Error(
      "You are not authorized to reset an admin password."
    );
    roleError.status = 403;
    throw roleError;
  }

  const userClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY,
  {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const { error: updateError } =
  await userClient.auth.updateUser({
    password: newPassword,
  });

if (updateError) throw updateError;

  return {
    message:
      "Admin password updated successfully. You can now log in with your new password.",
  };
};


// ADMIN LOGOUT
exports.logoutAdmin = async (accessToken) => {
  if (!accessToken) {
    const error = new Error("Authentication token is required.");
    error.status = 401;
    throw error;
  }

  const admin = getSupabaseAdmin();

  const { error } = await admin.auth.admin.signOut(
    accessToken,
    "local"
  );

  if (error) throw error;

  return {
    message: "Admin logged out successfully.",
  };
};
