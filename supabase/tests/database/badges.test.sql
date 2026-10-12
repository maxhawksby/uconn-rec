-- Badges and awards, tested by acting as different students. Run with `npm run test:db`.
begin;
select plan(19);

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

-- Max is an admin at UConn; Ava is a UConn student; Yuki is at Yale (opened for this test).
delete from public.waitlist; delete from public.meetups; delete from public.groups; delete from auth.users;
delete from public.orgs where kind <> 'major'; delete from public.awards where id not in ('founder', 'pilot-crew', 'meetup-host');
update public.schools set is_pilot = true where id = 'yale';
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000000', 'max@uconn.edu'),
  ('b0000000-0000-0000-0000-000000000000', 'ava@uconn.edu'),
  ('d0000000-0000-0000-0000-000000000000', 'yuki@yale.edu');
select set_config('request.jwt.claims', '{"role":"service_role"}', true); -- setup runs as the admin service
insert into public.students (id, school_id, first_name, last_name, class_year) values
  ('a0000000-0000-0000-0000-000000000000', 'uconn', 'Max', 'H', 'Junior'),
  ('b0000000-0000-0000-0000-000000000000', 'uconn', 'Ava', 'A', 'Junior'),
  ('d0000000-0000-0000-0000-000000000000', 'yale', 'Yuki', 'Y', 'Junior');
insert into public.admins (student_id) values ('a0000000-0000-0000-0000-000000000000');
insert into public.orgs (id, school_id, kind, name) values ('yale-crew', 'yale', 'team', 'Yale Crew');

-- ---------- Identity badges ----------
select pg_temp.act_as('b0000000-0000-0000-0000-000000000000', 'ava@uconn.edu');
select ok((select count(*) from public.orgs where kind = 'major') > 50, 'every campus starts with the standard majors');
select is((select count(*)::int from public.orgs where id = 'yale-crew'), 0, 'another campus''s orgs stay hidden');
insert into public.orgs (id, kind, name) values ('ava-club', 'club', 'Run Club');
select is((select school_id from public.orgs where id = 'ava-club'), 'uconn', 'a new org belongs to the student''s campus');
select throws_ok($$ insert into public.orgs (kind, name) values ('club', 'run club ') $$, '23505', null, 'no duplicate names on a campus');
select throws_ok($$ insert into public.orgs (school_id, kind, name) values ('yale', 'club', 'Sneaky') $$, '42501', null, 'cannot add orgs to another campus');
select lives_ok($$ insert into public.student_badges (org_id) values ('major-kinesiology'), ('major-nursing'), ('ava-club') $$, 'students wear majors and orgs');
select throws_ok($$ insert into public.student_badges (org_id) values ('major-finance') $$, 'P0001', 'Pick up to two majors.', 'up to two majors');
select throws_ok($$ insert into public.student_badges (org_id) values ('yale-crew') $$, '42501', null, 'cannot wear another campus''s org');
select throws_ok($$ insert into public.student_badges (student_id, org_id) values ('a0000000-0000-0000-0000-000000000000', 'ava-club') $$,
  '42501', null, 'cannot put a badge on someone else');

select pg_temp.act_as('d0000000-0000-0000-0000-000000000000', 'yuki@yale.edu');
select is((select count(*)::int from public.student_badges), 0, 'other campuses can''t see your badges');

-- ---------- Awards ----------
select pg_temp.act_as('b0000000-0000-0000-0000-000000000000', 'ava@uconn.edu');
select throws_ok($$ insert into public.student_awards (student_id, award_id) values (auth.uid(), 'founder') $$,
  '42501', null, 'students cannot give themselves awards');
select throws_ok($$ insert into public.awards (name, icon) values ('Fake', 'star') $$, '42501', null, 'students cannot create awards');

select pg_temp.act_as('a0000000-0000-0000-0000-000000000000', 'max@uconn.edu');
select lives_ok($$ insert into public.student_awards (student_id, award_id) values (auth.uid(), 'founder') $$, 'the admin wears the Founder crown');
select lives_ok($$ insert into public.awards (id, name, icon, rank) values ('iron', 'Iron Streak', 'fire', 20) $$, 'admins create awards');
select throws_ok($$ insert into public.awards (name, icon, rank) values ('Co-founder', 'crown', 0) $$, '42501', null, 'rank 0 stays the Founder''s');
select lives_ok($$ insert into public.student_awards (student_id, award_id, note) values ('b0000000-0000-0000-0000-000000000000', 'iron', '30 days straight') $$,
  'admins award students at their campus');
select throws_ok($$ insert into public.student_awards (student_id, award_id) values ('d0000000-0000-0000-0000-000000000000', 'iron') $$,
  '42501', null, 'admins only award their own campus');

select pg_temp.act_as('b0000000-0000-0000-0000-000000000000', 'ava@uconn.edu');
select is((select count(*)::int from public.student_awards), 2, 'classmates see each other''s awards');

select pg_temp.act_as(null);
select is((select count(*)::int from public.student_awards), 0, 'signed-out visitors see no awards');

select * from finish();
rollback;
