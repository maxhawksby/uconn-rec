-- The app subscribes to live changes on these tables (TABLE_SLICES in src/data/remote.ts).
-- If any one is missing from the publication, the server rejects the whole subscription and
-- nothing syncs live, so keep this list in step with the app.
begin;
select plan(1);
select set_eq(
  $$ select tablename::text from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' $$,
  array['students', 'follows', 'workouts', 'workout_notes', 'workout_tags', 'workout_photos', 'kudos', 'comments',
        'meetups', 'meetup_attendees', 'groups', 'group_members', 'group_messages'],
  'every table the app listens to publishes live changes');
select * from finish();
rollback;
