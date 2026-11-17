CREATE TABLE IF NOT EXISTS public.driver_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    driver_id UUID NOT NULL
        REFERENCES public.driver_profiles(id)
        ON DELETE CASCADE,

    document_type TEXT NOT NULL
        CHECK (
            document_type IN (
                'drivers_license',
                'identity_document',
                'vehicle_document'
            )
        ),

    storage_path TEXT NOT NULL UNIQUE,

    verification_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            verification_status IN (
                'pending',
                'approved',
                'rejected'
            )
        ),

    review_notes TEXT,

    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT driver_documents_review_consistency
    CHECK (
        (
            verification_status = 'pending'
            AND reviewed_at IS NULL
            AND reviewed_by IS NULL
        )
        OR
        (
            verification_status IN ('approved', 'rejected')
            AND reviewed_at IS NOT NULL
            AND reviewed_by IS NOT NULL
        )
    ),

    CONSTRAINT driver_documents_rejection_reason
    CHECK (
        verification_status <> 'rejected'
        OR NULLIF(TRIM(review_notes), '') IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id
ON public.driver_documents (driver_id);

CREATE INDEX IF NOT EXISTS idx_driver_documents_status
ON public.driver_documents (verification_status);

CREATE INDEX IF NOT EXISTS idx_driver_documents_type_submitted
ON public.driver_documents (
    driver_id,
    document_type,
    submitted_at DESC
);

ALTER TABLE public.driver_documents
ENABLE ROW LEVEL SECURITY;