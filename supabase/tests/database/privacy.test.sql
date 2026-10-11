-- Privacy rules, tested by acting as different students. Run with `npm run test:db`.
begin;
select plan(47);

-- Act as a signed-in student (or anon with null), the way the API does.
create function pg_temp.act_as(uid uuid, email text default null) returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  if uid is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('role', 'anon', true);
  else
    perform set_config('request.jwt.claims', json_build_object('sub', uid, 'email', email, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
  end if;
end $$;
grant execute on function pg_temp.act_as to anon, authenticated;

-- Start from an empty campus (seeded demo data would skew the counts). The whole file runs
-- in one transaction that rolls back, so the real data comes back afterwards.
delete from public.waitlist; delete from public.meetups; delete from public.groups; delete from auth.users;

-- Ava, Ben and Cam are at UConn. Yuki is at Yale, opened just for this test.
update public.schools set is_pilot = true where id = 'yale';
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000000', 'ava@uconn.edu'),
  ('b0000000-0000-0000-0000-000000000000', 'ben@grad.uconn.edu'),
  ('c0000000-0000-0000-0000-000000000000', 'cam@uconn.edu'),
  ('d0000000-0000-0000-0000-000000000000', 'yuki@yale.edu'),
  ('e0000000-0000-0000-0000-000000000000', 'eve@umass.edu');

-- ---------- Sign-up gate ----------
select is(private.school_for_email('ben@grad.uconn.edu'), 'uconn', 'subdomains match their school');
select is(private.school_for_email('x@notuconn.edu'), null, 'lookalike domains do not match');
select is(public.hook_before_user_created('{"user":{"email":"x@gmail.com"}}') -> 'error' ->> 'http_code', '403', 'non-school emails cannot create accounts');
select is(public.hook_before_user_created('{"user":{"email":"x@umass.edu"}}') -> 'error' ->> 'message', 'Your campus is not open yet. Join the waitlist instead.', 'waitlisted campuses cannot create accounts');
select is(public.hook_before_user_created('{"user":{"email":"x@uconn.edu"}}'), '{}'::jsonb, 'pilot campus emails can create accounts');

-- Profiles take their school from the verified email, whatever the client sends.
select pg_temp.act_as('a0000000-0000-0000-0000-000000000000', 'ava@uconn.edu');
insert into public.students (id, school_id, first_name, last_name, class_year) values ('a0000000-0000-0000-0000-000000000000', 'yale', 'Ava', 'A', 'Junior');
select is((select school_id from public.students where id = auth.uid()), 'uconn', 'school comes from the email, not the client');
select throws_ok($$ insert into public.students (id, school_id, first_name, last_name, class_year) values ('c0000000-0000-0000-0000-000000000000', 'uconn', 'Not', 'Cam', 'Junior') $$,
  '42501', null, 'cannot create a profile for someone else');
select pg_temp.act_as('b0000000-0000-0000-0000-000000000000', 'ben@grad.uconn.edu');
insert into public.students (id, school_id, first_name, last_name, class_year) values ('b0000000-0000-0000-0000-000000000000', 'uconn', 'Ben', 'B', 'Senior');
select pg_temp.act_as('c0000000-0000-0000-0000-000000000000', 'cam@uconn.edu');
insert into public.students (id, school_id, first_name, last_name, class_year) values ('c0000000-0000-0000-0000-000000000000', 'uconn', 'Cam', 'C', 'Sophomore');
select pg_temp.act_as('d0000000-0000-0000-0000-000000000000', 'yuki@yale.edu');
insert into public.students (id, school_id, first_name, last_name, class_year) values ('d0000000-0000-0000-0000-000000000000', 'uconn', 'Yuki', 'Y', 'Junior');
select pg_temp.act_as('e0000000-0000-0000-0000-000000000000', 'eve@umass.edu');
select throws_ok($$ insert into public.students (id, school_id, first_name, last_name, class_year) values ('e0000000-0000-0000-0000-000000000000', 'uconn', 'Eve', 'E', 'Junior') $$,
  'P0001', 'Your campus is not open yet.', 'waitlisted students cannot create a profile');

-- Mid sign-up (verified, no profile yet) a student can already find classmates and groups.
select pg_temp.act_as('f0000000-0000-0000-0000-000000000000', 'fay@uconn.edu');
select is((select count(*)::int from public.students), 3, 'verified students see their campus before finishing their profile');
select pg_temp.act_as('f0000000-0000-0000-0000-000000000000', 'fay@umass.edu');
select is((select count(*)::int from public.students), 0, 'waitlisted emails see no one');

select pg_temp.act_as('d0000000-0000-0000-0000-000000000000', 'yuki@yale.edu');
select is((select count(*)::int from public.students), 1, 'students only see their own campus');
update public.students set school_id = 'uconn' where id = auth.uid();
select is((select school_id from public.students where id = auth.uid()), 'yale', 'students cannot move themselves to another campus');
select throws_ok($$ insert into public.follows (follower_id, followee_id) values (auth.uid(), 'a0000000-0000-0000-0000-000000000000') $$,
  '42501', null, 'cannot follow students at another campus');

-- ---------- Workouts and visibility ----------
-- Ben follows Ava; Cam does not.
select pg_temp.act_as('b0000000-0000-0000-0000-000000000000', 'ben@grad.uconn.edu');
insert into public.follows (follower_id, followee_id) values (auth.uid(), 'a0000000-0000-0000-0000-000000000000');

select pg_temp.act_as('a0000000-0000-0000-0000-000000000000', 'ava@uconn.edu');
insert into public.workouts (id, kind, title, started_at, duration_sec, visibility, activity_id) values
  ('10000000-0000-0000-0000-00000000000f', 'class', 'Friends yoga', now(), 1800, 'friends', 'yoga'),
  ('10000000-0000-0000-0000-00000000000c', 'class', 'Campus yoga', now(), 1800, 'campus', 'yoga'),
  ('10000000-0000-0000-0000-00000000000a', 'class', 'Private yoga', now(), 1800, 'private', 'yoga');
insert into public.workout_notes (workout_id, body) values ('10000000-0000-0000-0000-00000000000f', 'knee felt off');
select throws_ok($$ insert into public.workouts (student_id, kind, title, started_at, duration_sec, activity_id) values ('b0000000-0000-0000-0000-000000000000', 'class', 'Fake', now(), 60, 'yoga') $$,
  '42501', null, 'cannot log a workout as someone else');
select throws_ok($$ insert into public.workouts (kind, title, started_at, duration_sec) values ('lift', 'Empty', now(), 60) $$,
  '23514', null, 'a lift needs exercises');
select throws_ok($$ insert into public.kudos (workout_id) values ('10000000-0000-0000-0000-00000000000f') $$,
  '42501', null, 'cannot give kudos to yourself');

select pg_temp.act_as('b0000000-0000-0000-0000-000000000000', 'ben@grad.uconn.edu');
select set_eq($$ select title from public.workouts $$, array['Friends yoga', 'Campus yoga'], 'followers see friends and campus workouts');
select is((select count(*)::int from public.workout_notes), 0, 'private notes stay private');
select lives_ok($$ insert into public.kudos (workout_id) values ('10000000-0000-0000-0000-00000000000f') $$, 'followers can give kudos');
select lives_ok($$ insert into public.comments (workout_id, body) values ('10000000-0000-0000-0000-00000000000f', 'nice') $$, 'followers can comment');

select pg_temp.act_as('c0000000-0000-0000-0000-000000000000', 'cam@uconn.edu');
select set_eq($$ select title from public.workouts $$, array['Campus yoga'], 'classmates who do not follow see only campus workouts');
select is((select count(*)::int from public.comments), 0, 'comments on hidden workouts are hidden');
select throws_ok($$ insert into public.comments (workout_id, body) values ('10000000-0000-0000-0000-00000000000f', 'hi') $$,
  '42501', null, 'cannot comment on a workout you cannot see');

select pg_temp.act_as('d0000000-0000-0000-0000-000000000000', 'yuki@yale.edu');
select is((select count(*)::int from public.workouts), 0, 'other campuses see no workouts');

select pg_temp.act_as(null);
select is((select count(*)::int from public.workouts), 0, 'signed-out visitors see no workouts');
select is((select count(*)::int from public.students), 0, 'signed-out visitors see no students');

-- ---------- Tagged friends and photos ----------
select pg_temp.act_as('a0000000-0000-0000-0000-000000000000', 'ava@uconn.edu');
insert into public.workout_tags (workout_id, student_id) values ('10000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-000000000000');
select throws_ok($$ insert into public.workout_tags (workout_id, student_id) values ('10000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-000000000000') $$,
  '42501', null, 'cannot tag students at another campus');

select pg_temp.act_as('b0000000-0000-0000-0000-000000000000', 'ben@grad.uconn.edu');
select throws_ok($$ insert into public.workout_tags (workout_id, student_id) values ('10000000-0000-0000-0000-00000000000f', 'c0000000-0000-0000-0000-000000000000') $$,
  '42501', null, 'only the owner tags friends');
select throws_ok($$ select public.respond_to_tag('10000000-0000-0000-0000-00000000000a', true) $$,
  'P0001', 'That tag is gone.', 'cannot accept a tag meant for someone else');

select pg_temp.act_as('c0000000-0000-0000-0000-000000000000', 'cam@uconn.edu');
select ok(exists (select 1 from public.workouts where title = 'Private yoga'), 'tagged friends see the workout');
select throws_ok($$ insert into public.workout_photos (workout_id, path) values ('10000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a/1.jpg') $$,
  '42501', null, 'cannot add photos before accepting the tag');
select public.respond_to_tag('10000000-0000-0000-0000-00000000000a', true);
select lives_ok($$ insert into public.workout_photos (workout_id, path) values ('10000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a/1.jpg') $$,
  'accepted friends can add photos');
select throws_ok($$ insert into public.workout_photos (workout_id, path) values ('10000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000c/2.jpg') $$,
  '23514', null, 'photo paths must sit under their workout');

-- ---------- Groups and chat ----------
select pg_temp.act_as('a0000000-0000-0000-0000-000000000000', 'ava@uconn.edu');
insert into public.groups (id, name, kind) values ('20000000-0000-0000-0000-000000000000', '6AM Lift Club', 'crew');
insert into public.group_messages (group_id, body) values ('20000000-0000-0000-0000-000000000000', 'lifting at 6');
select is((select school_id from public.groups), 'uconn', 'groups belong to the creator''s campus');
select throws_ok($$ insert into public.groups (name, kind) values ('6am lift club ', 'crew') $$, '23505', null, 'group names are unique per campus');

select pg_temp.act_as('b0000000-0000-0000-0000-000000000000', 'ben@grad.uconn.edu');
select is((select count(*)::int from public.group_messages), 0, 'non-members cannot read the chat');
select throws_ok($$ insert into public.group_messages (group_id, body) values ('20000000-0000-0000-0000-000000000000', 'hi') $$,
  '42501', null, 'non-members cannot post');
insert into public.group_members (group_id, student_id) values ('20000000-0000-0000-0000-000000000000', auth.uid());
select is((select count(*)::int from public.group_messages), 1, 'members read the chat');

select pg_temp.act_as('d0000000-0000-0000-0000-000000000000', 'yuki@yale.edu');
select throws_ok($$ insert into public.group_members (group_id, student_id) values ('20000000-0000-0000-0000-000000000000', auth.uid()) $$,
  '42501', null, 'cannot join groups at another campus');

-- ---------- Meetups ----------
select pg_temp.act_as('a0000000-0000-0000-0000-000000000000', 'ava@uconn.edu');
insert into public.meetups (id, activity_id, title, location, starts_at, capacity) values
  ('30000000-0000-0000-0000-000000000000', 'basketball', 'Pickup', 'Court 2', now() + interval '1 hour', 2);
select is((select count(*)::int from public.meetup_attendees), 1, 'the host is the first attendee');
delete from public.meetup_attendees where student_id = auth.uid();
select is((select count(*)::int from public.meetup_attendees), 1, 'hosts cancel instead of leaving');

select pg_temp.act_as('b0000000-0000-0000-0000-000000000000', 'ben@grad.uconn.edu');
select lives_ok($$ select public.join_meetup('30000000-0000-0000-0000-000000000000') $$, 'classmates can join');
select pg_temp.act_as('c0000000-0000-0000-0000-000000000000', 'cam@uconn.edu');
select throws_ok($$ select public.join_meetup('30000000-0000-0000-0000-000000000000') $$, 'P0001', 'It''s full. Ask the host to add spots.', 'full meetups reject joins');
select throws_ok($$ insert into public.meetup_attendees (meetup_id, student_id) values ('30000000-0000-0000-0000-000000000000', auth.uid()) $$,
  '42501', null, 'cannot skip the capacity check');

-- ---------- Waitlist ----------
select pg_temp.act_as(null);
select is((select place from public.join_waitlist('Eve@UMass.edu', 'umass-amherst')), 1::bigint, 'signed-out visitors can join a waitlist');
select throws_ok($$ select * from public.join_waitlist('eve@gmail.com', 'umass-amherst') $$, 'P0001', 'Use your school email address.', 'waitlist needs the school''s email');
select throws_ok($$ select * from public.waitlist $$, '42501', null, 'nobody can read the waitlist emails');

select * from finish();
rollback;
