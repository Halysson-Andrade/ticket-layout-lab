
INSERT INTO public.simulated_events (company_id, external_id, name, date, venue, city, status, image_url)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'EVT-MIRAGE-52987',
  'Circo Mirage Circus Ribeirão Preto - 11.JUL às 15h30',
  '2026-07-11 15:30:00-03',
  'Circo Mirage Circus - Rodovia Antônio Machado Sant''Anna',
  'Ribeirão Preto / SP',
  'ativo',
  'https://s3.guicheweb.com.br/imagenseventos/15-06-2026_12-55-36.jpg'
)
ON CONFLICT DO NOTHING;
