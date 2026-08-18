create schema english_recall;

revoke all on schema english_recall from public;
revoke all on schema english_recall from anon;
revoke all on schema english_recall from authenticated;
grant usage on schema english_recall to authenticated;
grant usage on schema english_recall to service_role;

create table english_recall.learner_profiles (
  learner_profile_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  content_profile_id text not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learner_profiles_display_name_length
    check (char_length(btrim(display_name)) between 1 and 80),
  constraint learner_profiles_content_profile_id_format
    check (content_profile_id ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  constraint learner_profiles_settings_object
    check (jsonb_typeof(settings) = 'object')
);

create index learner_profiles_user_id_idx
  on english_recall.learner_profiles (user_id);

create table english_recall.review_events (
  sync_seq bigint generated always as identity unique,
  event_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  learner_profile_id uuid not null
    references english_recall.learner_profiles (learner_profile_id) on delete cascade,
  card_id text not null,
  rating text not null,
  reviewed_at timestamptz not null,
  effective_at timestamptz not null,
  device_id text not null,
  scheduler_version smallint not null,
  created_at timestamptz not null default now(),
  constraint review_events_card_id_format
    check (card_id ~ '^[0-9a-f]{64}$'),
  constraint review_events_rating
    check (rating in ('unknown', 'fuzzy', 'known')),
  constraint review_events_device_id_format
    check (device_id ~ '^[A-Za-z0-9._:-]{1,128}$'),
  constraint review_events_scheduler_version
    check (scheduler_version = 1)
);

create index review_events_user_sync_seq_idx
  on english_recall.review_events (user_id, sync_seq);

create index review_events_profile_card_sync_seq_idx
  on english_recall.review_events (learner_profile_id, card_id, sync_seq);

create function english_recall.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function english_recall.set_updated_at() from public;
revoke all on function english_recall.set_updated_at() from anon;
revoke all on function english_recall.set_updated_at() from authenticated;

create trigger learner_profiles_set_updated_at
before update on english_recall.learner_profiles
for each row execute function english_recall.set_updated_at();

alter table english_recall.learner_profiles enable row level security;
alter table english_recall.review_events enable row level security;

create policy learner_profiles_select_own
on english_recall.learner_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy learner_profiles_insert_own
on english_recall.learner_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy learner_profiles_update_own
on english_recall.learner_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy learner_profiles_delete_own
on english_recall.learner_profiles
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy review_events_select_own
on english_recall.review_events
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy review_events_insert_own
on english_recall.review_events
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from english_recall.learner_profiles as profile
    where profile.learner_profile_id = review_events.learner_profile_id
      and profile.user_id = (select auth.uid())
  )
);

revoke all on english_recall.learner_profiles from anon;
revoke all on english_recall.review_events from anon;

grant select on english_recall.learner_profiles to authenticated;
grant insert (
  learner_profile_id,
  user_id,
  display_name,
  content_profile_id,
  settings
) on english_recall.learner_profiles to authenticated;
grant update (
  display_name,
  content_profile_id,
  settings
) on english_recall.learner_profiles to authenticated;
grant delete on english_recall.learner_profiles to authenticated;

grant select on english_recall.review_events to authenticated;
grant insert (
  event_id,
  user_id,
  learner_profile_id,
  card_id,
  rating,
  reviewed_at,
  effective_at,
  device_id,
  scheduler_version
) on english_recall.review_events to authenticated;
grant usage, select on sequence english_recall.review_events_sync_seq_seq to authenticated;

grant all on all tables in schema english_recall to service_role;
grant all on all sequences in schema english_recall to service_role;

alter default privileges in schema english_recall revoke all on tables from public;
alter default privileges in schema english_recall revoke all on sequences from public;
alter default privileges in schema english_recall revoke execute on functions from public;
