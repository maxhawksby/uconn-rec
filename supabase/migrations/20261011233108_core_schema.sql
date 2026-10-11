-- Valence core schema. Tables mirror src/data/types.ts. Every privacy rule the app shows
-- (who sees which workout, who can chat in a group) is enforced here with row-level
-- security, so a modified client can never read or write more than the UI allows.
-- Helper functions live in the `private` schema, which the API does not expose.

create schema if not exists private;

-- ---------- Schools and the waitlist ----------

create table public.schools (
  id text primary key,
  name text not null,
  short_name text not null,
  email_domains text[] not null check (cardinality(email_domains) > 0),
  city text not null,
  state text not null,
  is_pilot boolean not null default false
);

create table public.waitlist (
  email text primary key check (email = lower(email) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  school_id text not null references public.schools on delete cascade,
  created_at timestamptz not null default now()
);
create index on public.waitlist (school_id, created_at);

-- The school whose domain (or a subdomain of it) matches the email, e.g. grad.uconn.edu.
create function private.school_for_email(email text) returns text
language sql stable security definer set search_path = '' as $$
  select s.id from public.schools s, unnest(s.email_domains) d
  where split_part(lower(email), '@', 2) = d or split_part(lower(email), '@', 2) like '%.' || d
  limit 1
$$;

-- ---------- Students ----------

create table public.students (
  id uuid primary key references auth.users on delete cascade,
  school_id text not null references public.schools,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 40),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 40),
  class_year text not null check (class_year in ('First year', 'Sophomore', 'Junior', 'Senior', 'Grad student')),
  interests text[] not null default '{}',
  bio text check (char_length(bio) <= 160),
  created_at timestamptz not null default now()
);
create index on public.students (school_id);

-- Before the profile exists (sign-up's "find your people" step), the verified email decides.
create function private.my_school() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select school_id from public.students where id = auth.uid()),
    (select s.id from public.schools s where s.is_pilot and s.id = private.school_for_email(auth.jwt() ->> 'email')))
$$;

create function private.same_school(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.students where id = other and school_id = private.my_school())
$$;

-- The school always comes from the verified sign-in email, never from the client.
create function private.students_set_school() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Admin tools (the demo seed) run as service_role and set the school themselves.
  if auth.role() = 'service_role' then return new; end if;
  if tg_op = 'INSERT' then
    new.school_id := private.school_for_email(auth.jwt() ->> 'email');
    if new.school_id is null or not exists (select 1 from public.schools where id = new.school_id and is_pilot) then
      raise exception 'Your campus is not open yet.' using errcode = 'P0001';
    end if;
    new.created_at := now();
  else
    new.school_id := old.school_id;
    new.created_at := old.created_at;
  end if;
  new.interests := array(select distinct unnest(new.interests));
  return new;
end $$;
create trigger students_set_school before insert or update on public.students
  for each row execute function private.students_set_school();

-- ---------- Follows ----------

create table public.follows (
  follower_id uuid not null references public.students on delete cascade,
  followee_id uuid not null references public.students on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index on public.follows (followee_id);

-- ---------- Groups ----------

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references public.schools default private.my_school(),
  name text not null check (char_length(btrim(name)) between 1 and 50),
  kind text not null check (kind in ('dorm', 'club', 'team', 'major', 'crew')),
  description text not null default '' check (char_length(description) <= 200),
  created_by uuid not null references public.students on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index groups_unique_name on public.groups (school_id, lower(btrim(name)));

create table public.group_members (
  group_id uuid not null references public.groups on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, student_id)
);
create index on public.group_members (student_id);

create function private.is_member(g uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members where group_id = g and student_id = auth.uid())
$$;

create function private.group_in_my_school(g uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.groups where id = g and school_id = private.my_school())
$$;

-- The creator joins their own group.
create function private.groups_add_creator() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.group_members (group_id, student_id) values (new.id, new.created_by);
  return new;
end $$;
create trigger groups_add_creator after insert on public.groups
  for each row execute function private.groups_add_creator();

create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  student_id uuid not null references public.students on delete cascade default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index on public.group_messages (group_id, created_at);

-- ---------- Workouts ----------

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade default auth.uid(),
  kind text not null check (kind in ('lift', 'run', 'ride', 'sport', 'class', 'other')),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  started_at timestamptz not null,
  duration_sec integer not null check (duration_sec between 0 and 86400),
  visibility text not null default 'friends' check (visibility in ('friends', 'campus', 'private')),
  group_id uuid references public.groups on delete set null,
  exercises jsonb,      -- lift: [{ name, sets: [{ reps, weight }] }]
  distance_km numeric,  -- run, ride
  route jsonb,          -- run, ride: [{ lat, lng, t }]
  activity_id text,     -- sport, class, other
  result text check (char_length(result) <= 80),
  created_at timestamptz not null default now(),
  -- coalesce: a missing field makes the comparison null, which a check would let through
  check (coalesce(case kind
    when 'lift' then jsonb_typeof(exercises) = 'array' and jsonb_array_length(exercises) between 1 and 50
    when 'run' then distance_km > 0 and distance_km < 1000
    when 'ride' then distance_km > 0 and distance_km < 1000
    else activity_id is not null end, false))
);
create index on public.workouts (student_id, started_at desc);
create index on public.workouts (started_at desc);

-- The private note is its own table so other students can never select it.
create table public.workout_notes (
  workout_id uuid primary key references public.workouts on delete cascade,
  student_id uuid not null references public.students on delete cascade default auth.uid(),
  body text not null check (char_length(body) between 1 and 1000)
);

-- Friends you trained with. They see the workout right away and choose to accept the tag;
-- accepted tags put the workout on their profile and let them add photos.
create table public.workout_tags (
  workout_id uuid not null references public.workouts on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  primary key (workout_id, student_id)
);
create index on public.workout_tags (student_id, status);

create function private.is_tagged(w uuid, accepted_only boolean default false) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.workout_tags
    where workout_id = w and student_id = auth.uid() and (status = 'accepted' or (not accepted_only and status = 'pending')))
$$;

-- Mirrors selectors.canSee: you always see your own; private is only you; friends means
-- people who follow you; campus adds everyone at your school. Tagged friends also see it.
create function private.can_view_workout(w uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workouts x where x.id = w and (
      x.student_id = auth.uid()
      or private.is_tagged(x.id)
      or (x.visibility <> 'private' and (
        exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = x.student_id)
        or (x.visibility = 'campus' and private.same_school(x.student_id))))))
$$;

create function private.owns_workout(w uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.workouts where id = w and student_id = auth.uid())
$$;

create table public.workout_photos (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts on delete cascade,
  student_id uuid not null references public.students on delete cascade default auth.uid(),
  path text not null unique,  -- object name in the workout-photos bucket: <workout_id>/<file>
  created_at timestamptz not null default now(),
  check (split_part(path, '/', 1) = workout_id::text)
);
create index on public.workout_photos (workout_id, created_at);

create table public.kudos (
  workout_id uuid not null references public.workouts on delete cascade,
  student_id uuid not null references public.students on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (workout_id, student_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts on delete cascade,
  student_id uuid not null references public.students on delete cascade default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index on public.comments (workout_id, created_at);

-- ---------- Meetups ----------

create table public.meetups (
  id uuid primary key default gen_random_uuid(),
  school_id text not null references public.schools default private.my_school(),
  host_id uuid not null references public.students on delete cascade default auth.uid(),
  activity_id text not null,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  location text not null check (char_length(btrim(location)) between 1 and 80),
  starts_at timestamptz not null,
  capacity integer not null check (capacity between 2 and 100),
  group_id uuid references public.groups on delete set null,
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index on public.meetups (school_id, starts_at);

create table public.meetup_attendees (
  meetup_id uuid not null references public.meetups on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (meetup_id, student_id)
);
create index on public.meetup_attendees (student_id);

create function private.meetups_add_host() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.meetup_attendees (meetup_id, student_id) values (new.id, new.host_id);
  return new;
end $$;
create trigger meetups_add_host after insert on public.meetups
  for each row execute function private.meetups_add_host();

-- ---------- Row-level security ----------

alter table public.schools enable row level security;
alter table public.waitlist enable row level security;
alter table public.students enable row level security;
alter table public.follows enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_notes enable row level security;
alter table public.workout_tags enable row level security;
alter table public.workout_photos enable row level security;
alter table public.kudos enable row level security;
alter table public.comments enable row level security;
alter table public.meetups enable row level security;
alter table public.meetup_attendees enable row level security;

-- Schools are public reference data. The waitlist is write-only through join_waitlist().
create policy "schools are public" on public.schools for select using (true);

-- Students see their own campus.
create policy "see students at my school" on public.students for select to authenticated
  using (id = auth.uid() or school_id = private.my_school());
create policy "create my profile" on public.students for insert to authenticated
  with check (id = auth.uid());
create policy "edit my profile" on public.students for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "see follows at my school" on public.follows for select to authenticated
  using (follower_id = auth.uid() or followee_id = auth.uid() or (private.same_school(follower_id) and private.same_school(followee_id)));
create policy "follow students at my school" on public.follows for insert to authenticated
  with check (follower_id = auth.uid() and private.same_school(followee_id));
create policy "unfollow" on public.follows for delete to authenticated
  using (follower_id = auth.uid());

create policy "see groups at my school" on public.groups for select to authenticated
  using (school_id = private.my_school());
create policy "create groups at my school" on public.groups for insert to authenticated
  with check (created_by = auth.uid() and school_id = private.my_school());

create policy "see members of groups at my school" on public.group_members for select to authenticated
  using (private.group_in_my_school(group_id));
create policy "join groups at my school" on public.group_members for insert to authenticated
  with check (student_id = auth.uid() and private.group_in_my_school(group_id));
create policy "leave groups" on public.group_members for delete to authenticated
  using (student_id = auth.uid());

create policy "members read the chat" on public.group_messages for select to authenticated
  using (private.is_member(group_id));
create policy "members post to the chat" on public.group_messages for insert to authenticated
  with check (student_id = auth.uid() and private.is_member(group_id));

create policy "see workouts I am allowed to" on public.workouts for select to authenticated
  using (private.can_view_workout(id));
create policy "log my workouts" on public.workouts for insert to authenticated
  with check (student_id = auth.uid() and (group_id is null or private.is_member(group_id)));
create policy "delete my workouts" on public.workouts for delete to authenticated
  using (student_id = auth.uid());

create policy "my notes only" on public.workout_notes for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid() and private.owns_workout(workout_id));

create policy "see tags on workouts I can see" on public.workout_tags for select to authenticated
  using (private.can_view_workout(workout_id));
create policy "owner tags classmates" on public.workout_tags for insert to authenticated
  with check (private.owns_workout(workout_id) and student_id <> auth.uid() and private.same_school(student_id) and status = 'pending');
create policy "owner or tagged student removes a tag" on public.workout_tags for delete to authenticated
  using (private.owns_workout(workout_id) or student_id = auth.uid());

create policy "see photos on workouts I can see" on public.workout_photos for select to authenticated
  using (private.can_view_workout(workout_id));
create policy "owner and accepted friends add photos" on public.workout_photos for insert to authenticated
  with check (student_id = auth.uid() and (private.owns_workout(workout_id) or private.is_tagged(workout_id, true)));
create policy "uploader or owner removes a photo" on public.workout_photos for delete to authenticated
  using (student_id = auth.uid() or private.owns_workout(workout_id));

create policy "see kudos on workouts I can see" on public.kudos for select to authenticated
  using (private.can_view_workout(workout_id));
create policy "give kudos to others" on public.kudos for insert to authenticated
  with check (student_id = auth.uid() and private.can_view_workout(workout_id) and not private.owns_workout(workout_id));
create policy "take back my kudos" on public.kudos for delete to authenticated
  using (student_id = auth.uid());

create policy "see comments on workouts I can see" on public.comments for select to authenticated
  using (private.can_view_workout(workout_id));
create policy "comment on workouts I can see" on public.comments for insert to authenticated
  with check (student_id = auth.uid() and private.can_view_workout(workout_id));
create policy "delete my comments" on public.comments for delete to authenticated
  using (student_id = auth.uid());

create policy "see meetups at my school" on public.meetups for select to authenticated
  using (school_id = private.my_school());
create policy "host meetups at my school" on public.meetups for insert to authenticated
  with check (host_id = auth.uid() and school_id = private.my_school()
    and starts_at > now() - interval '5 minutes'
    and (group_id is null or private.is_member(group_id)));
create policy "host cancels" on public.meetups for delete to authenticated
  using (host_id = auth.uid());

create policy "see attendees at my school" on public.meetup_attendees for select to authenticated
  using (exists (select 1 from public.meetups m where m.id = meetup_id and m.school_id = private.my_school()));
create policy "leave meetups I don't host" on public.meetup_attendees for delete to authenticated
  using (student_id = auth.uid() and not exists (select 1 from public.meetups m where m.id = meetup_id and m.host_id = auth.uid()));
-- Joining goes through join_meetup() so capacity is checked under a lock.

-- ---------- Functions the app calls ----------

-- Joining checks capacity while holding a lock on the meetup, so two students can't
-- both take the last spot.
create function public.join_meetup(meetup uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.meetups;
begin
  select * into m from public.meetups where id = meetup for update;
  if not found or m.school_id is distinct from private.my_school() then
    raise exception 'That meetup was cancelled.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.meetup_attendees where meetup_id = meetup and student_id = auth.uid()) then return; end if;
  if (select count(*) from public.meetup_attendees where meetup_id = meetup) >= m.capacity then
    raise exception 'It''s full. Ask the host to add spots.' using errcode = 'P0001';
  end if;
  insert into public.meetup_attendees (meetup_id, student_id) values (meetup, auth.uid());
end $$;

-- A tagged student accepts or declines; nobody else can change a tag's status.
create function public.respond_to_tag(workout uuid, accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.workout_tags set status = case when accept then 'accepted' else 'declined' end
  where workout_id = workout and student_id = auth.uid();
  if not found then raise exception 'That tag is gone.' using errcode = 'P0001'; end if;
end $$;

-- Anyone can join a waitlist for a school that isn't open yet. Returns the place in line.
create function public.join_waitlist(student_email text, school text) returns table (place bigint, total bigint)
language plpgsql security definer set search_path = '' as $$
declare e text := lower(btrim(student_email));
begin
  if e !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Enter a valid school email.' using errcode = 'P0001'; end if;
  if private.school_for_email(e) is distinct from school then raise exception 'Use your school email address.' using errcode = 'P0001'; end if;
  insert into public.waitlist (email, school_id) values (e, school) on conflict do nothing;
  return query
    select (select count(*) from public.waitlist w where w.school_id = school
              and w.created_at <= (select x.created_at from public.waitlist x where x.email = e)),
           (select count(*) from public.waitlist w where w.school_id = school);
end $$;

create function public.waitlist_count(school text) returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from public.waitlist where school_id = school
$$;

-- Auth hook: only students whose email belongs to an open (pilot) campus can create an
-- account. Everyone else is sent to the waitlist by the app.
create function public.hook_before_user_created(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s text := private.school_for_email(event -> 'user' ->> 'email');
begin
  if s is null then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Use your school email address.'));
  end if;
  if not exists (select 1 from public.schools where id = s and is_pilot) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Your campus is not open yet. Join the waitlist instead.'));
  end if;
  return '{}'::jsonb;
end $$;

-- ---------- Grants ----------

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

revoke execute on function public.join_meetup, public.respond_to_tag from public, anon;
revoke execute on function public.hook_before_user_created from public, anon, authenticated;
grant execute on function public.hook_before_user_created to supabase_auth_admin;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.school_for_email to supabase_auth_admin;
grant select on public.schools to supabase_auth_admin;
grant execute on function public.join_waitlist, public.waitlist_count to anon, authenticated;

-- Writes the app never makes are closed at the grant level too.
revoke update on public.follows, public.groups, public.group_members, public.group_messages, public.workouts,
  public.workout_tags, public.workout_photos, public.kudos, public.comments, public.meetups, public.meetup_attendees
  from anon, authenticated;
revoke insert on public.meetup_attendees, public.waitlist, public.schools from anon, authenticated;
revoke all on public.waitlist from anon, authenticated;

-- ---------- Live updates ----------

alter publication supabase_realtime add table
  public.students, public.follows, public.groups, public.group_members, public.group_messages,
  public.workouts, public.workout_notes, public.workout_tags, public.workout_photos, public.kudos, public.comments,
  public.meetups, public.meetup_attendees;

-- ---------- Photo storage ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workout-photos', 'workout-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp']);

create policy "see photos on workouts I can see" on storage.objects for select to authenticated
  using (bucket_id = 'workout-photos' and private.can_view_workout(((storage.foldername(name))[1])::uuid));
create policy "owner and accepted friends upload photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'workout-photos'
    and (private.owns_workout(((storage.foldername(name))[1])::uuid) or private.is_tagged(((storage.foldername(name))[1])::uuid, true)));
create policy "uploader removes a photo" on storage.objects for delete to authenticated
  using (bucket_id = 'workout-photos' and owner_id = auth.uid()::text);
