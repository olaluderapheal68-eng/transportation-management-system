
const { getSupabaseAdmin } = require("../../config/supabase");

const { randomUUID } = require("crypto");

const DOCUMENT_BUCKET_NAME = "driver-documents";
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


// Map uploaded form fields to database document types
const DOCUMENT_FIELD_MAP = {
  driversLicense: "drivers_license",
  identityDocument: "identity_document",
  vehicleDocument: "vehicle_document",
};

// Upload a verification document to private Supabase Storage
async function uploadVerificationDocument(userId, file, documentType) {
  const supabase = getSupabaseAdmin();

  const extensions = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const extension = extensions[file.mimetype];

  if (!extension) {
    throw new Error("Unsupported document format.");
  }

  const filePath =
    `${userId}/${documentType}/${randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(DOCUMENT_BUCKET_NAME)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new Error(`Document upload failed: ${error.message}`);
  }

  return filePath;
}

// Submit new driver verification documents or resubmit rejected ones

async function submitDriverDocuments(userId, files) {
  const supabase = getSupabaseAdmin();

  // Confirm that the driver has completed their profile
  const { data: profile, error: profileError } = await supabase
    .from("driver_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;

  if (!profile) {
    const error = new Error(
      "Complete your driver profile before submitting verification documents."
    );
    error.status = 400;
    throw error;
  }

  // Confirm that the driver has a vehicle record
  const { data: vehicle, error: vehicleError } = await supabase
    .from("driver_vehicles")
    .select("driver_id")
    .eq("driver_id", userId)
    .maybeSingle();

  if (vehicleError) throw vehicleError;

  if (!vehicle) {
    const error = new Error(
      "Complete your vehicle information before submitting verification documents."
    );
    error.status = 400;
    throw error;
  }

  const submissions = Object.entries(DOCUMENT_FIELD_MAP)
    .filter(([field]) => files?.[field]?.[0])
    .map(([field, documentType]) => ({
      documentType,
      file: files[field][0],
    }));

  if (submissions.length === 0) {
    const error = new Error(
      "At least one verification document is required."
    );
    error.status = 400;
    throw error;
  }

  // Check the latest submission for each document type
  for (const submission of submissions) {
    const { data: previousDocument, error } = await supabase
      .from("driver_documents")
      .select("verification_status")
      .eq("driver_id", userId)
      .eq("document_type", submission.documentType)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (previousDocument?.verification_status === "pending") {
      const requestError = new Error(
        `${submission.documentType} is already awaiting review.`
      );
      requestError.status = 409;
      throw requestError;
    }

    if (previousDocument?.verification_status === "approved") {
      const requestError = new Error(
        `${submission.documentType} has already been approved.`
      );
      requestError.status = 409;
      throw requestError;
    }

    // A rejected document can be resubmitted.
  }

  const uploadedPaths = [];
  let insertedDocumentIds = [];

  try {
    const records = [];

    // Upload each submitted document
    for (const submission of submissions) {
      const storagePath = await uploadVerificationDocument(
        userId,
        submission.file,
        submission.documentType
      );

      uploadedPaths.push(storagePath);

      records.push({
        driver_id: userId,
        document_type: submission.documentType,
        storage_path: storagePath,
        verification_status: "pending",
      });
    }

    // Save document records
    const { data: insertedDocuments, error: insertError } =
      await supabase
        .from("driver_documents")
        .insert(records)
        .select(
          "id, document_type, verification_status, submitted_at"
        );

    if (insertError) throw insertError;

    insertedDocumentIds = insertedDocuments.map(
      (document) => document.id
    );

    // Restore the overall vehicle verification status
    // so the driver returns to the pending review queue.
    const { error: statusError } = await supabase
      .from("driver_vehicles")
      .update({
        verification_status: "pending",
        verification_notes: null,
        verified_at: null,
        verified_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("driver_id", userId);

    if (statusError) throw statusError;

    return {
      message:
        "Verification documents submitted successfully. Awaiting administrator review.",
      documents: insertedDocuments,
    };
  } catch (error) {
    // Remove inserted database records if a later step fails
    if (insertedDocumentIds.length > 0) {
      const { error: rollbackError } = await supabase
        .from("driver_documents")
        .delete()
        .in("id", insertedDocumentIds);

      if (rollbackError) {
        console.error(
          "Document database cleanup failed:",
          rollbackError.message
        );
      }
    }

    // Remove uploaded files if the operation fails
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await supabase.storage
        .from(DOCUMENT_BUCKET_NAME)
        .remove(uploadedPaths);

      if (cleanupError) {
        console.error(
          "Document storage cleanup failed:",
          cleanupError.message
        );
      }
    }

    throw error;
  }
}


// Retrieve the authenticated driver's document submissions
async function getDriverDocuments(userId) {
  const supabase = getSupabaseAdmin();

  const { data: documents, error } = await supabase
    .from("driver_documents")
    .select(`
      id,
      document_type,
      storage_path,
      verification_status,
      review_notes,
      submitted_at,
      reviewed_at
    `)
    .eq("driver_id", userId)
    .order("submitted_at", { ascending: false });

  if (error) throw error;

  // Generate temporary private document URLs
  const formattedDocuments = await Promise.all(
    documents.map(async (document) => {
      const { data, error: signedUrlError } = await supabase.storage
        .from(DOCUMENT_BUCKET_NAME)
        .createSignedUrl(document.storage_path, 600);

      if (signedUrlError) throw signedUrlError;

      return {
        id: document.id,
        documentType: document.document_type,
        verificationStatus: document.verification_status,
        reviewNotes: document.review_notes,
        submittedAt: document.submitted_at,
        reviewedAt: document.reviewed_at,
        documentUrl: data.signedUrl,
      };
    })
  );

  return {
    totalDocuments: formattedDocuments.length,
    documents: formattedDocuments,
  };
}


module.exports = {
  createDriverProfile,
  updateDriverProfile,
  getDriverProfileDetails,
  submitDriverDocuments,
  getDriverDocuments,
};