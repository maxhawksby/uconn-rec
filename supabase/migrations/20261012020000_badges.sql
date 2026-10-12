-- Badges. Two kinds:
-- - Identity badges: a student's major and the organizations they're in (Greek life, clubs,
--   teams). Picked from a campus list that students can add to. Self-declared, like a bio.
-- - Awards: accomplishment badges that only admins give (Max's Founder crown is the first).
--   An award shows next to the student's name everywhere.

-- ---------- Organizations and identity badges ----------

-- school_id null = on every campus (the standard majors list); otherwise one campus's own.
create table public.orgs (
  id text primary key default gen_random_uuid()::text,
  school_id text references public.schools default private.my_school(),
  kind text not null check (kind in ('major', 'greek', 'club', 'team')),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  created_by uuid references public.students on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index orgs_unique_name on public.orgs (coalesce(school_id, '*'), kind, lower(btrim(name)));

create table public.student_badges (
  student_id uuid not null references public.students on delete cascade default auth.uid(),
  org_id text not null references public.orgs on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, org_id)
);
create index on public.student_badges (org_id);

-- Up to two majors (a double major) and twelve badges in all.
create function private.check_badge_limits() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k text;
begin
  select kind into k from public.orgs where id = new.org_id;
  if k = 'major' and (select count(*) from public.student_badges b join public.orgs o on o.id = b.org_id
      where b.student_id = new.student_id and o.kind = 'major') >= 2 then
    raise exception 'Pick up to two majors.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.student_badges where student_id = new.student_id) >= 12 then
    raise exception 'You can show up to 12 badges.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger student_badges_limits before insert on public.student_badges
  for each row execute function private.check_badge_limits();

-- ---------- Admins and awards ----------

-- Admins are set by the operator (scripts/make-admin.cjs), never from the app.
create table public.admins (
  student_id uuid primary key references public.students on delete cascade,
  created_at timestamptz not null default now()
);

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where student_id = auth.uid())
$$;

-- rank: lower shows first; the lowest-ranked award a student holds sits next to their name.
create table public.awards (
  id text primary key default gen_random_uuid()::text,
  name text not null unique check (char_length(btrim(name)) between 2 and 40),
  description text not null default '' check (char_length(description) <= 140),
  icon text not null check (char_length(icon) between 1 and 40), -- a MaterialCommunityIcons name (see src/profile/awards.tsx)
  tone text not null default 'gold' check (tone in ('gold', 'accent', 'ink', 'turf')),
  rank integer not null default 100,
  created_by uuid references public.students on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.student_awards (
  student_id uuid not null references public.students on delete cascade,
  award_id text not null references public.awards on delete cascade,
  awarded_by uuid references public.students on delete set null default auth.uid(),
  note text check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  primary key (student_id, award_id)
);
create index on public.student_awards (award_id);

insert into public.awards (id, name, description, icon, tone, rank, created_by) values
  ('founder', 'Founder', 'Started Valence.', 'crown', 'gold', 0, null),
  ('pilot-crew', 'Pilot Crew', 'One of the first students on Valence.', 'rocket-launch', 'accent', 10, null),
  ('meetup-host', 'Meetup Host', 'Brings people together for pickup games and group workouts.', 'bullhorn', 'ink', 50, null);

-- ---------- Row-level security ----------

alter table public.orgs enable row level security;
alter table public.student_badges enable row level security;
alter table public.admins enable row level security;
alter table public.awards enable row level security;
alter table public.student_awards enable row level security;

create policy "see shared and campus orgs" on public.orgs for select to authenticated
  using (school_id is null or school_id = private.my_school());
create policy "add an org to my campus" on public.orgs for insert to authenticated
  with check (created_by = auth.uid() and school_id = private.my_school());

create policy "see badges at my school" on public.student_badges for select to authenticated
  using (student_id = auth.uid() or private.same_school(student_id));
create policy "wear a badge" on public.student_badges for insert to authenticated
  with check (student_id = auth.uid() and exists (
    select 1 from public.orgs o where o.id = org_id and (o.school_id is null or o.school_id = private.my_school())));
create policy "take off a badge" on public.student_badges for delete to authenticated
  using (student_id = auth.uid());

create policy "see who is an admin" on public.admins for select to authenticated using (true);

create policy "see awards" on public.awards for select to authenticated using (true);
create policy "admins create awards" on public.awards for insert to authenticated
  with check (private.is_admin() and created_by = auth.uid() and rank >= 10); -- rank 0 stays the Founder's

create policy "see awards at my school" on public.student_awards for select to authenticated
  using (student_id = auth.uid() or private.same_school(student_id));
create policy "admins give awards" on public.student_awards for insert to authenticated
  with check (private.is_admin() and awarded_by = auth.uid() and private.same_school(student_id));
create policy "admins take awards back" on public.student_awards for delete to authenticated
  using (private.is_admin());

revoke update on public.orgs, public.student_badges, public.awards, public.student_awards from anon, authenticated;
revoke insert, delete on public.admins from anon, authenticated;
grant execute on all functions in schema private to authenticated;

alter publication supabase_realtime add table public.orgs, public.student_badges, public.awards, public.student_awards;
