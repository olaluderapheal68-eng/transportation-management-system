
const { getSupabaseAdmin } = require("../../config/supabase");

const VEHICLE_BUCKET = "driver-vehicles";
const DOCUMENT_BUCKET = "driver-documents";

const REQUIRED_DOCUMENT_TYPES = [
  "drivers_license",
  "identity_document",
  "vehicle_document",
];

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Retrieve drivers waiting for verification
exports.getPendingDrivers = async () => {
  const supabase = getSupabaseAdmin();

  const { data: vehicles, error: vehicleError } = await supabase
    .from("driver_vehicles")
    .select("*")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

  if (vehicleError) throw vehicleError;

  if (!vehicles || vehicles.length === 0) {
    return {
      totalDrivers: 0,
      drivers: [],
    };
  }

  const driverIds = vehicles.map((vehicle) => vehicle.driver_id);

  const { data: profiles, error: profileError } = await supabase
    .from("driver_profiles")
    .select("id, full_name, phone_number")
    .in("id", driverIds);

  if (profileError) throw profileError;

  const { data: documents, error: documentError } = await supabase
    .from("driver_documents")
    .select("id, driver_id, document_type, verification_status, submitted_at")
    .in("driver_id", driverIds)
    .order("submitted_at", { ascending: false });

  if (documentError) throw documentError;

  const profileMap = new Map(
    profiles.map((profile) => [profile.id, profile])
  );

  const latestDocuments = new Map();

  for (const document of documents) {
    const key = `${document.driver_id}:${document.document_type}`;

    if (!latestDocuments.has(key)) {
      latestDocuments.set(key, document);
    }
  }

  return {
    totalDrivers: vehicles.length,
    drivers: vehicles.map((vehicle) => {
      const profile = profileMap.get(vehicle.driver_id);

      return {
        driverId: vehicle.driver_id,
        fullName: profile?.full_name || null,
        phoneNumber: profile?.phone_number || null,
        vehicle: {
          id: vehicle.id,
          plateNumber: vehicle.plate_number,
          passengerSeats: vehicle.passenger_seats,
          verificationStatus: vehicle.verification_status,
          verificationNotes: vehicle.verification_notes,
          createdAt: vehicle.created_at,
        },
        documents: REQUIRED_DOCUMENT_TYPES.map((type) => {
          const document = latestDocuments.get(
            `${vehicle.driver_id}:${type}`
          );

          return {
            documentType: type,
            status: document?.verification_status || "missing",
            documentId: document?.id || null,
            submittedAt: document?.submitted_at || null,
          };
        }),
      };
    }),
  };
};

// Retrieve one driver's profile, vehicle and documents
exports.getDriverVerificationDetails = async (driverId) => {
  const supabase = getSupabaseAdmin();

  const { data: profile, error: profileError } = await supabase
    .from("driver_profiles")
    .select("*")
    .eq("id", driverId)
    .maybeSingle();

  if (profileError) throw profileError;

  if (!profile) {
    throw createError("Driver profile not found.", 404);
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("driver_vehicles")
    .select("*")
    .eq("driver_id", driverId)
    .maybeSingle();

  if (vehicleError) throw vehicleError;

  if (!vehicle) {
    throw createError("Driver vehicle information not found.", 404);
  }

  const { data: documents, error: documentError } = await supabase
    .from("driver_documents")
    .select("*")
    .eq("driver_id", driverId)
    .order("submitted_at", { ascending: false });

  if (documentError) throw documentError;

  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(driverId);

  if (userError) throw userError;

  // Generate temporary access links for private vehicle photographs
  const { data: plateImage, error: plateError } = await supabase.storage
    .from(VEHICLE_BUCKET)
    .createSignedUrl(vehicle.plate_image_path, 600);

  if (plateError) throw plateError;

  const { data: carImage, error: carError } = await supabase.storage
    .from(VEHICLE_BUCKET)
    .createSignedUrl(vehicle.car_image_path, 600);

  if (carError) throw carError;

  // Generate temporary access links for private documents
  const formattedDocuments = await Promise.all(
    documents.map(async (document) => {
      const { data, error } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUrl(document.storage_path, 600);

      if (error) throw error;

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
    driver: {
      id: profile.id,
      fullName: profile.full_name,
      email: userData.user?.email || null,
      phoneNumber: profile.phone_number,
    },

    vehicle: {
      id: vehicle.id,
      plateNumber: vehicle.plate_number,
      passengerSeats: vehicle.passenger_seats,
      verificationStatus: vehicle.verification_status,
      verificationNotes: vehicle.verification_notes,
      plateImageUrl: plateImage.signedUrl,
      carImageUrl: carImage.signedUrl,
    },

    documents: formattedDocuments,
  };
};

// Approve or reject an individual document
exports.reviewDriverDocument = async ({
  driverId,
  documentId,
  adminId,
  status,
  reviewNotes,
}) => {
  const supabase = getSupabaseAdmin();

  if (!["approved", "rejected"].includes(status)) {
    throw createError(
      "Status must be approved or rejected."
    );
  }

  if (status === "rejected" && !reviewNotes?.trim()) {
    throw createError(
      "A rejection reason is required."
    );
  }

  const { data: document, error: fetchError } = await supabase
    .from("driver_documents")
    .select("*")
    .eq("id", documentId)
    .eq("driver_id", driverId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (!document) {
    throw createError("Driver document not found.", 404);
  }

  if (document.verification_status !== "pending") {
    throw createError(
      "This document has already been reviewed.",
      409
    );
  }

  const now = new Date().toISOString();

  const { data: updatedDocument, error: updateError } =
    await supabase
      .from("driver_documents")
      .update({
        verification_status: status,
        review_notes:
          status === "rejected" ? reviewNotes.trim() : null,
        reviewed_at: now,
        reviewed_by: adminId,
        updated_at: now,
      })
      .eq("id", documentId)
      .eq("driver_id", driverId)
      .eq("verification_status", "pending")
      .select()
      .maybeSingle();

  if (updateError) throw updateError;

  if (!updatedDocument) {
    throw createError(
      "The document was already reviewed. Refresh and try again.",
      409
    );
  }

  // A rejected document means the overall vehicle verification
  // must remain rejected until the driver resubmits it.
  if (status === "rejected") {
    const { error: vehicleError } = await supabase
      .from("driver_vehicles")
      .update({
        verification_status: "rejected",
        verification_notes: reviewNotes.trim(),
        verified_at: now,
        verified_by: adminId,
        updated_at: now,
      })
      .eq("driver_id", driverId);

    if (vehicleError) throw vehicleError;
  }

  return {
    message: `Driver document ${status} successfully.`,
    document: {
      id: updatedDocument.id,
      documentType: updatedDocument.document_type,
      verificationStatus: updatedDocument.verification_status,
      reviewNotes: updatedDocument.review_notes,
      reviewedAt: updatedDocument.reviewed_at,
    },
  };
};

// Make the final driver and vehicle verification decision
exports.reviewDriverVerification = async ({
  driverId,
  adminId,
  status,
  reviewNotes,
}) => {
  const supabase = getSupabaseAdmin();

  if (!["approved", "rejected"].includes(status)) {
    throw createError(
      "Status must be approved or rejected."
    );
  }

  if (status === "rejected" && !reviewNotes?.trim()) {
    throw createError(
      "A rejection reason is required."
    );
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("driver_vehicles")
    .select("id, driver_id")
    .eq("driver_id", driverId)
    .maybeSingle();

  if (vehicleError) throw vehicleError;

  if (!vehicle) {
    throw createError(
      "Driver vehicle information not found.",
      404
    );
  }

  if (status === "approved") {
    const { data: documents, error: documentError } =
      await supabase
        .from("driver_documents")
        .select("document_type, verification_status, submitted_at")
        .eq("driver_id", driverId)
        .order("submitted_at", { ascending: false });

    if (documentError) throw documentError;

    const latestDocuments = new Map();

    for (const document of documents) {
      if (!latestDocuments.has(document.document_type)) {
        latestDocuments.set(document.document_type, document);
      }
    }

    const missingOrUnapproved = REQUIRED_DOCUMENT_TYPES.filter(
      (type) =>
        latestDocuments.get(type)?.verification_status !== "approved"
    );

    if (missingOrUnapproved.length > 0) {
      throw createError(
        "All three latest verification documents must be approved before approving the driver. Outstanding: " +
          missingOrUnapproved.join(", "),
        409
      );
    }
  }

  const now = new Date().toISOString();

  const { data: updatedVehicle, error: updateError } =
    await supabase
      .from("driver_vehicles")
      .update({
        verification_status: status,
        verification_notes:
          status === "rejected" ? reviewNotes.trim() : null,
        verified_at: now,
        verified_by: adminId,
        updated_at: now,
      })
      .eq("driver_id", driverId)
      .select()
      .single();

  if (updateError) throw updateError;

  return {
    message: `Driver verification ${status} successfully.`,
    driverId,
    verificationStatus: updatedVehicle.verification_status,
    verificationNotes: updatedVehicle.verification_notes,
    verifiedAt: updatedVehicle.verified_at,
    verifiedBy: updatedVehicle.verified_by,
  };
};
