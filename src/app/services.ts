import { DexieLearnerProfileStore } from '../infrastructure/db/DexieLearnerProfileStore';
import { db } from '../infrastructure/db/database';
import { SupabaseAuthClient } from '../infrastructure/supabase/SupabaseAuthClient';
import { supabase } from '../infrastructure/supabase/client';
import { SupabaseLearnerProfileRepository } from '../infrastructure/supabase/SupabaseLearnerProfileRepository';

export const appServices = {
  auth: new SupabaseAuthClient(supabase),
  profiles: new SupabaseLearnerProfileRepository(supabase),
  localProfiles: new DexieLearnerProfileStore(db),
};
