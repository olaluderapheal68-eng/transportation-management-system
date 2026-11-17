CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    admin_id UUID REFERENCES auth.users(id)
        ON DELETE SET NULL,

    driver_id UUID REFERENCES public.driver_profiles(id)
        ON DELETE SET NULL,

    document_id UUID REFERENCES public.driver_documents(id)
        ON DELETE SET NULL,

    action TEXT NOT NULL CHECK (
        action IN (
            'document_approved',
            'document_rejected',
            'driver_approved',
            'driver_rejected'
        )
    ),

    previous_status TEXT,
    new_status TEXT,
    reason TEXT,

    details JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id
ON public.admin_audit_logs(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_driver_id
ON public.admin_audit_logs(driver_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
ON public.admin_audit_logs(created_at DESC);

ALTER TABLE public.admin_audit_logs
ENABLE ROW LEVEL SECURITY;