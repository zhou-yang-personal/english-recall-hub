-- PostgREST requires a table-level INSERT grant for this mutation path.
-- RLS still enforces user_id = auth.uid() for every inserted row.
grant insert on table english_recall.learner_profiles to authenticated;
