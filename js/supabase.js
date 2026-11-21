// Configure em js/config.js (não coloque a service_role key no navegador).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
export const supabaseReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('SEU-PROJETO'));
export const supabase = supabaseReady ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
export async function getPublishedGames(){if(!supabaseReady)return null;const {data,error}=await supabase.from('games').select('*').eq('published',true).order('sort_order');if(error)throw error;return data;}
