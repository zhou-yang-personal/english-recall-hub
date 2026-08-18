begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'rls-user-1@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'rls-user-2@example.test');

insert into english_recall.learner_profiles (
  learner_profile_id,
  user_id,
  display_name,
  content_profile_id,
  settings
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'User 1 learner',
    'manman',
    '{}'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'User 2 learner',
    'manman',
    '{}'
  );

insert into english_recall.review_events (
  event_id,
  user_id,
  learner_profile_id,
  card_id,
  rating,
  reviewed_at,
  effective_at,
  device_id,
  scheduler_version
)
values
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    repeat('a', 64),
    'known',
    '2026-08-18T02:00:00Z',
    '2026-08-18T02:00:00Z',
    'rls-device-1',
    1
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    repeat('b', 64),
    'fuzzy',
    '2026-08-18T02:01:00Z',
    '2026-08-18T02:01:00Z',
    'rls-device-2',
    1
  );

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  'select count(*) from english_recall.learner_profiles',
  array[1::bigint],
  'User 1 sees only their LearnerProfile'
);

select results_eq(
  'select count(*) from english_recall.review_events',
  array[1::bigint],
  'User 1 sees only their ReviewEvent'
);

select lives_ok(
  $$
    insert into english_recall.learner_profiles (
      learner_profile_id, user_id, display_name, content_profile_id, settings
    ) values (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      '11111111-1111-4111-8111-111111111111',
      'User 1 second learner',
      'manman',
      '{}'
    )
  $$,
  'User 1 can create their own LearnerProfile'
);

select throws_ok(
  $$
    insert into english_recall.learner_profiles (
      learner_profile_id, user_id, display_name, content_profile_id, settings
    ) values (
      'ffffffff-ffff-4fff-8fff-ffffffffffff',
      '22222222-2222-4222-8222-222222222222',
      'Cross-account learner',
      'manman',
      '{}'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "learner_profiles"',
  'User 1 cannot create a LearnerProfile for User 2'
);

select lives_ok(
  $$
    insert into english_recall.review_events (
      event_id, user_id, learner_profile_id, card_id, rating,
      reviewed_at, effective_at, device_id, scheduler_version
    ) values (
      '12345678-1234-4234-8234-123456789abc',
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      repeat('c', 64),
      'unknown',
      '2026-08-18T02:02:00Z',
      '2026-08-18T02:02:00Z',
      'rls-device-1',
      1
    )
  $$,
  'User 1 can append an event for their own LearnerProfile'
);

select throws_ok(
  $$
    insert into english_recall.review_events (
      event_id, user_id, learner_profile_id, card_id, rating,
      reviewed_at, effective_at, device_id, scheduler_version
    ) values (
      '87654321-4321-4321-8321-cba987654321',
      '11111111-1111-4111-8111-111111111111',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      repeat('d', 64),
      'known',
      '2026-08-18T02:03:00Z',
      '2026-08-18T02:03:00Z',
      'rls-device-1',
      1
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "review_events"',
  'User 1 cannot append an event to User 2 learner'
);

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select results_eq(
  'select learner_profile_id from english_recall.learner_profiles order by learner_profile_id',
  $$values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid)$$,
  'User 2 sees only their LearnerProfile'
);

select results_eq(
  'select event_id from english_recall.review_events order by event_id',
  $$values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid)$$,
  'User 2 sees only their ReviewEvent'
);

select ok(
  not has_table_privilege('authenticated', 'english_recall.review_events', 'UPDATE'),
  'Authenticated users cannot update append-only ReviewEvents'
);

select ok(
  not has_table_privilege('authenticated', 'english_recall.review_events', 'DELETE'),
  'Authenticated users cannot delete append-only ReviewEvents'
);

select * from finish();
rollback;
