-- Habilita o acesso público de leitura (SELECT) ao bucket de imagens de fundo
CREATE POLICY "Acesso público às imagens do evento" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'event-assets');
