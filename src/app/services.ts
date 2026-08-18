import { DexieContentStore } from '../infrastructure/db/DexieContentStore';
import { DexieLearnerProfileStore } from '../infrastructure/db/DexieLearnerProfileStore';
import { db } from '../infrastructure/db/database';
import { GitHubCardSource } from '../infrastructure/github/GitHubCardSource';
import { SupabaseAuthClient } from '../infrastructure/supabase/SupabaseAuthClient';
import { supabase } from '../infrastructure/supabase/client';
import { SupabaseLearnerProfileRepository } from '../infrastructure/supabase/SupabaseLearnerProfileRepository';
import { getRuntimeConfig } from '../shared/runtimeConfig';

const config = getRuntimeConfig();

export const appServices = {
  auth: new SupabaseAuthClient(supabase),
  profiles: new SupabaseLearnerProfileRepository(supabase),
  localProfiles: new DexieLearnerProfileStore(db),
  cardSource: new GitHubCardSource(config.VITE_CARD_REPOSITORY_BASE_URL),
  contentStore: new DexieContentStore(db),
  database: db,
};
