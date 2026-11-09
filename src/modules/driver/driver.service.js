
const { getSupabaseAdmin } = require("../../config/supabase");

const BUCKET_NAME = "driver-vehicles";

// Upload a driver's vehicle photograph
async function uploadDriverImage(userId, file, imageType) {
  const supabase = getSupabaseAdmin();

  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const extension = extensions[file.mimetype];

  if (!extension) {
    throw new Error("Unsupported image format.");
  }

  const filePath = `${userId}/${imageType}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  return filePath;
}

// Save a driver's initial profile and vehicle
async function createDriverProfile(userId, data, files) {
  const supabase = getSupabaseAdmin();

  const {
    fullName,
    phoneNumber,
    plateNumber,
    passengerSeats,
  } = data;

  if (!fullName?.trim() || !phoneNumber?.trim() ||
      !plateNumber?.trim() || !passengerSeats) {
    throw new Error("All driver and vehicle fields are required.");
  }

  if (!files?.plateImage?.[0] || !files?.carImage?.[0]) {
    throw new Error("Both plate and car photographs are required.");
  }

  const seats = Number(passengerSeats);

  if (!Number.isInteger(seats) || seats < 1) {
    throw new Error("Passenger seats must be a positive whole number.");
  }

  let plateImagePath;
  let carImagePath;

  try {
    plateImagePath = await uploadDriverImage(
      userId,
      files.plateImage[0],
      "plate"
    );

    carImagePath = await uploadDriverImage(
      userId,
      files.carImage[0],
      "car"
    );

    const { error: profileError } = await supabase
      .from("driver_profiles")
      .upsert({
        id: userId,
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        updated_at: new Date().toISOString(),
      });

    if (profileError) throw profileError;

    const { data: vehicle, error: vehicleError } = await supabase
      .from("driver_vehicles")
      .upsert(
        {
          driver_id: userId,
          plate_number: plateNumber.trim().toUpperCase(),
          plate_image_path: plateImagePath,
          car_image_path: carImagePath,
          passenger_seats: seats,
          verification_status: "pending",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "driver_id" }
      )
      .select()
      .single();

    if (vehicleError) throw vehicleError;

    return {
      message: "Driver profile and vehicle saved successfully. Vehicle verification is pending.",
      vehicle,
    };
  } catch (error) {
    const paths = [plateImagePath, carImagePath].filter(Boolean);

    if (paths.length > 0) {
      await supabase.storage.from(BUCKET_NAME).remove(paths);
    }

    throw error;
  }
}

// Update an existing driver profile and vehicle
async function updateDriverProfile(userId, data, files) {
  const supabase = getSupabaseAdmin();

  const {
    fullName,
    phoneNumber,
    plateNumber,
    passengerSeats,
  } = data;

  if (!fullName?.trim() || !phoneNumber?.trim() ||
      !plateNumber?.trim() || !passengerSeats) {
    throw new Error("Full name, phone number, plate number and passenger seats are required.");
  }

  const seats = Number(passengerSeats);

  if (!Number.isInteger(seats) || seats < 1) {
    throw new Error("Passenger seats must be a positive whole number.");
  }

  // Get the driver's existing vehicle
  const { data: existingVehicle, error: fetchError } = await supabase
    .from("driver_vehicles")
    .select("*")
    .eq("driver_id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (!existingVehicle) {
    throw new Error("Driver vehicle information not found. Complete your profile first.");
  }

  let newPlateImagePath = existingVehicle.plate_image_path;
  let newCarImagePath = existingVehicle.car_image_path;

  const uploadedPaths = [];

  try {
    // Replace plate photograph only if a new one was uploaded
    if (files?.plateImage?.[0]) {
      newPlateImagePath = await uploadDriverImage(
        userId,
        files.plateImage[0],
        "plate"
      );

      uploadedPaths.push(newPlateImagePath);
    }

    // Replace car photograph only if a new one was uploaded
    if (files?.carImage?.[0]) {
      newCarImagePath = await uploadDriverImage(
        userId,
        files.carImage[0],
        "car"
      );

      uploadedPaths.push(newCarImagePath);
    }

    // Update driver details
    const { error: profileError } = await supabase
      .from("driver_profiles")
      .update({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) throw profileError;

    // Update vehicle and reset verification
    const { data: updatedVehicle, error: vehicleError } = await supabase
      .from("driver_vehicles")
      .update({
        plate_number: plateNumber.trim().toUpperCase(),
        passenger_seats: seats,
        plate_image_path: newPlateImagePath,
        car_image_path: newCarImagePath,
        verification_status: "pending",
        verification_notes: null,
        verified_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("driver_id", userId)
      .select()
      .single();

    if (vehicleError) throw vehicleError;

    // Remove replaced photographs after successful database update
    const oldPaths = [];

    if (files?.plateImage?.[0]) {
      oldPaths.push(existingVehicle.plate_image_path);
    }

    if (files?.carImage?.[0]) {
      oldPaths.push(existingVehicle.car_image_path);
    }

    if (oldPaths.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(oldPaths);

      if (deleteError) {
        console.error("Old image cleanup failed:", deleteError.message);
      }
    }

    return {
      message: "Driver profile updated successfully. Vehicle verification is now pending.",
      vehicle: updatedVehicle,
    };
  } catch (error) {
    // Remove newly uploaded images if the update fails
    if (uploadedPaths.length > 0) {
      await supabase.storage
        .from(BUCKET_NAME)
        .remove(uploadedPaths);
    }

    throw error;
  }
}

// Retrieve complete driver profile and vehicle
async function getDriverProfileDetails(userId) {
  const supabase = getSupabaseAdmin();

  const { data: profile, error: profileError } = await supabase
    .from("driver_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;

  if (!profile) {
    throw new Error("Driver profile has not been completed.");
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("driver_vehicles")
    .select("*")
    .eq("driver_id", userId)
    .maybeSingle();

  if (vehicleError) throw vehicleError;

  if (!vehicle) {
    throw new Error("Driver vehicle information not found.");
  }

  const { data: plateImage, error: plateError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(vehicle.plate_image_path, 3600);

  if (plateError) throw plateError;

  const { data: carImage, error: carError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(vehicle.car_image_path, 3600);

  if (carError) throw carError;

  return {
    id: userId,
    fullName: profile.full_name,
    email: null,
    phoneNumber: profile.phone_number,

    vehicle: {
      id: vehicle.id,
      plateNumber: vehicle.plate_number,
      passengerSeats: vehicle.passenger_seats,
      plateImageUrl: plateImage.signedUrl,
      carImageUrl: carImage.signedUrl,
      verificationStatus: vehicle.verification_status,
      verificationNotes: vehicle.verification_notes,
    },
  };
}

module.exports = {
  createDriverProfile,
  updateDriverProfile,
  getDriverProfileDetails,
};
