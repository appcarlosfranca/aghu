-- 1. Crie o usuário em Authentication > Users > Add user.
-- 2. Substitua o e-mail abaixo e execute.

update public.profiles p
set role='admin',active=true,updated_at=now()
from auth.users u
where p.id=u.id
  and lower(u.email)=lower('SEU_EMAIL_ADMIN@gmail.com');

select u.email,p.role,p.active
from auth.users u
join public.profiles p on p.id=u.id
where p.role='admin';
