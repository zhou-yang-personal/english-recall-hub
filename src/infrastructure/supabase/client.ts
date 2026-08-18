import { createClient } from '@supabase/supabase-js';
import { getRuntimeConfig } from '../../shared/runtimeConfig';

const config = getRuntimeConfig();

export const supabase = createClient(
  config.VITE_SUPABASE_URL,
  config.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    db: { schema: 'english_recall' },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
);
