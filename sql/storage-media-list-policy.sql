-- Permitir que somente o administrador autenticado liste arquivos do bucket game-media.
CREATE POLICY "Admins can list game media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'game-media'
  AND EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  )
);
