const {
  getSupabase,
  getSupabaseAdmin,
} = require("../../config/supabase");

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

  // Assign the role securely on the server.
  // Never trust a role supplied by the user's request body.
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

  // Only accounts assigned the trusted driver role can use driver login.
  if (data.user.app_metadata?.role !== "driver") {
    const error = new Error("This account is not registered as a driver.");
    error.status = 403;
    throw error;
  }

  return data;
};