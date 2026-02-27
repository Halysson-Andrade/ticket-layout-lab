
-- Fix: restrict audit_logs insert to set actor as current user
DROP POLICY "Authenticated users can insert audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can insert own audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = auth.uid());
