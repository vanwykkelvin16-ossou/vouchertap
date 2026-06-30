-- Integration fixes: realtime, member avatar uploads, is_admin lockdown

-- 1) Enable realtime for breakfast_meetings (app subscribes but table was missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'breakfast_meetings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.breakfast_meetings;
  END IF;
END $$;

-- 2) Let members upload/manage files in their own avatars/{user_id}/ folder
DROP POLICY IF EXISTS "Members insert own avatar" ON storage.objects;
CREATE POLICY "Members insert own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Members update own avatar" ON storage.objects;
CREATE POLICY "Members update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Members delete own avatar" ON storage.objects;
CREATE POLICY "Members delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

-- 3) Lock down is_admin RPC (authenticated only)
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
