// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://mjlzoadtjdlgsebwwvqw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qbHpvYWR0amRsZ3NlYnd3dnF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NjA2MzgsImV4cCI6MjA2NDAzNjYzOH0.FcfvExqTBMpgT8N7kW8QjDFt3_cobZ-lkGpRZOlGLjM";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);