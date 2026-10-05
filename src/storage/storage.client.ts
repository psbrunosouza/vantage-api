import type { SupabaseClient } from '@supabase/supabase-js';

export const STORAGE = Symbol('STORAGE');

export type StorageClient = SupabaseClient['storage'];
