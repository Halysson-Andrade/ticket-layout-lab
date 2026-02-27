
-- Table for short-lived exchange codes (2-step auth)
CREATE TABLE public.integration_exchange_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  id_evento TEXT NOT NULL,
  id_usuario_externo TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookup by code
CREATE INDEX idx_exchange_codes_code ON public.integration_exchange_codes(code) WHERE used = false;

-- Auto-cleanup: delete expired codes after 1 hour
-- (handled by app logic, but index helps)
CREATE INDEX idx_exchange_codes_expires ON public.integration_exchange_codes(expires_at);

-- Enable RLS
ALTER TABLE public.integration_exchange_codes ENABLE ROW LEVEL SECURITY;

-- Only service role should access this table (via edge functions)
-- No client-side policies needed

-- Add permission check URL to company_integrations
ALTER TABLE public.company_integrations 
ADD COLUMN IF NOT EXISTS url_check_permissao TEXT NULL;
