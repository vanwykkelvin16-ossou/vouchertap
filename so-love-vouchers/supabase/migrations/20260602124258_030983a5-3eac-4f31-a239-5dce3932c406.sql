
INSERT INTO public.user_roles (user_id, role)
VALUES ('137232da-8f62-45c2-8eb9-ced1e8b6c801', 'admin')
ON CONFLICT DO NOTHING;

DELETE FROM public.user_roles
WHERE user_id = '900aea4f-6648-4e83-a5e3-8720cb30939a'
  AND role = 'admin';
