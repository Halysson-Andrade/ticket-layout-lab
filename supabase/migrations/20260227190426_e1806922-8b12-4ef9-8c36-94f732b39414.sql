
-- Simulated events table for the demo company
CREATE TABLE public.simulated_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  external_id text NOT NULL,
  name text NOT NULL,
  date timestamp with time zone NOT NULL,
  venue text NOT NULL,
  city text NOT NULL,
  status text NOT NULL DEFAULT 'ativo',
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.simulated_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage simulated events" ON public.simulated_events
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view events of own company" ON public.simulated_events
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()));
