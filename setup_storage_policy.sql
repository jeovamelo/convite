-- Bucket público para assets do evento (background do site e artes-base dos layouts)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-assets', 'event-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Leitura pública anônima (SELECT) — necessária para o navegador carregar as imagens
DROP POLICY IF EXISTS "Acesso público às imagens do evento" ON storage.objects;
CREATE POLICY "Acesso público às imagens do evento"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-assets');

-- Upload/atualização/remoção apenas para usuários autenticados (admin)
DROP POLICY IF EXISTS "Upload autenticado nas imagens do evento" ON storage.objects;
CREATE POLICY "Upload autenticado nas imagens do evento"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-assets');

DROP POLICY IF EXISTS "Atualização autenticada nas imagens do evento" ON storage.objects;
CREATE POLICY "Atualização autenticada nas imagens do evento"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-assets')
WITH CHECK (bucket_id = 'event-assets');

DROP POLICY IF EXISTS "Remoção autenticada nas imagens do evento" ON storage.objects;
CREATE POLICY "Remoção autenticada nas imagens do evento"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-assets');
