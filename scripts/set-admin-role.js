
require("dotenv").config();

const { getSupabaseAdmin } = require("../src/config/supabase");

async function assignAdminRole() {
  const userId = process.argv[2];

  if (!userId) {
    throw new Error("Please provide the Supabase User ID.");
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Find the account
  const { data, error } =
    await supabaseAdmin.auth.admin.getUserById(userId);

  if (error) throw error;

  if (!data.user) {
    throw new Error("Admin account not found.");
  }

  // Preserve existing app metadata
  const { data: updated, error: updateError } =
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...(data.user.app_metadata || {}),
        role: "admin",
      },
    });

  if (updateError) throw updateError;

  console.log("Admin role assigned successfully.");
  console.log("Email:", updated.user.email);
  console.log("Role:", updated.user.app_metadata.role);
}

assignAdminRole().catch((error) => {
  console.error("Error:", error.message);
  process.exitCode = 1;
});
