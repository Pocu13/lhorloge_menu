ALTER TABLE public.dishes ADD COLUMN visible boolean NOT NULL DEFAULT true;
CREATE POLICY "Public read dish photos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'dish-photos');
CREATE POLICY "Admins upload dish photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dish-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update dish photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'dish-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete dish photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'dish-photos' AND public.has_role(auth.uid(), 'admin'));