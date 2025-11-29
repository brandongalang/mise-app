import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ivuxreviroawgxtiuwwr.supabase.co';
// The anon key is a public key that can be safely exposed
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2dXhyZXZpcm9hd2d4dGl1d3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzODI2NjIsImV4cCI6MjA2Mzk1ODY2Mn0.57IZ7dIR3hDzB0IGMJD_NxfJGPJyLJ1bkkY_fJW3umo';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// SUPABASE REST API CLIENT
// Clean wrapper with error handling and typed responses
// ============================================

export interface ApiResponse<T> {
  data: T | null;
  error: PostgrestError | null;
  count?: number | null;
}

export interface ApiError extends Error {
  code: string;
  details: string | null;
  hint: string | null;
}

function createApiError(error: PostgrestError): ApiError {
  const apiError = new Error(error.message) as ApiError;
  apiError.code = error.code;
  apiError.details = error.details;
  apiError.hint = error.hint;
  return apiError;
}

// ============================================
// TABLE-SPECIFIC API CLIENTS
// ============================================

export const api = {
  // Master Ingredients
  masterIngredients: {
    async findById(id: string) {
      const { data, error } = await supabase
        .from('master_ingredients')
        .select('*')
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw createApiError(error);
      return data;
    },

    async findByIds(ids: string[]) {
      const { data, error } = await supabase
        .from('master_ingredients')
        .select('*')
        .in('id', ids);
      if (error) throw createApiError(error);
      return data || [];
    },

    async findAll() {
      const { data, error } = await supabase
        .from('master_ingredients')
        .select('*');
      if (error) throw createApiError(error);
      return data || [];
    },

    async create(ingredient: {
      id: string;
      canonical_name: string;
      category?: string;
      default_unit?: string;
      default_shelf_life_days?: number;
    }) {
      const { data, error } = await supabase
        .from('master_ingredients')
        .insert(ingredient)
        .select()
        .single();
      if (error) throw createApiError(error);
      return data;
    },

    async upsert(ingredient: {
      id: string;
      canonical_name: string;
      category?: string;
      default_unit?: string;
      default_shelf_life_days?: number;
    }) {
      const { data, error } = await supabase
        .from('master_ingredients')
        .upsert(ingredient, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw createApiError(error);
      return data;
    },
  },

  // Ingredient Aliases
  aliases: {
    async findByAlias(alias: string) {
      const { data, error } = await supabase
        .from('ingredient_aliases')
        .select(`*, master_ingredients (id, canonical_name)`)
        .eq('alias', alias.toLowerCase())
        .single();
      if (error && error.code !== 'PGRST116') throw createApiError(error);
      return data;
    },

    async upsert(alias: string, masterId: string, source: 'agent' | 'user_correction' = 'agent') {
      const { data, error } = await supabase
        .from('ingredient_aliases')
        .upsert({
          alias: alias.toLowerCase(),
          master_id: masterId,
          source,
        }, { onConflict: 'alias' })
        .select()
        .single();
      if (error) throw createApiError(error);
      return data;
    },
  },

  // Containers
  containers: {
    async findById(id: string) {
      const { data, error } = await supabase
        .from('containers')
        .select(`*, contents (*), master_ingredients (*)`)
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw createApiError(error);
      return data;
    },

    async findByMasterId(masterId: string, statuses?: string[]) {
      let query = supabase
        .from('containers')
        .select(`*, contents (*), master_ingredients (*)`)
        .eq('master_id', masterId);

      if (statuses && statuses.length > 0) {
        query = query.in('status', statuses);
      }

      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw createApiError(error);
      return data || [];
    },

    async findActive(filters: {
      masterId?: string;
      statuses?: string[];
      expiringBefore?: Date;
      isDishOnly?: boolean;
      limit?: number;
    } = {}) {
      let query = supabase
        .from('containers')
        .select(`*, contents (*), master_ingredients (*)`)
        .neq('status', 'DELETED');

      if (filters.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses);
      }

      if (filters.masterId) {
        query = query.eq('master_id', filters.masterId);
      }

      if (filters.isDishOnly === false) {
        query = query.is('dish_name', null);
      }

      if (filters.expiringBefore) {
        query = query.lte('expires_at', filters.expiringBefore.toISOString()).not('expires_at', 'is', null);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw createApiError(error);
      return data || [];
    },

    async create(container: {
      id: string;
      master_id?: string | null;
      status: string;
      purchase_unit?: string;
      source?: string;
      confidence?: string;
      vision_job_id?: string;
      expires_at?: string;
      dish_name?: string;
      cooked_from_recipe_id?: string;
    }) {
      const { data, error } = await supabase
        .from('containers')
        .insert(container)
        .select()
        .single();
      if (error) throw createApiError(error);
      return data;
    },

    async update(id: string, updates: Record<string, unknown>) {
      const { data, error } = await supabase
        .from('containers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw createApiError(error);
      return data;
    },

    async softDelete(id: string) {
      return this.update(id, { status: 'DELETED' });
    },
  },

  // Contents
  contents: {
    async findByContainerId(containerId: string) {
      const { data, error } = await supabase
        .from('contents')
        .select('*')
        .eq('container_id', containerId)
        .single();
      if (error && error.code !== 'PGRST116') throw createApiError(error);
      return data;
    },

    async create(content: {
      id: string;
      container_id: string;
      remaining_qty: number;
      unit: string;
    }) {
      const { data, error } = await supabase
        .from('contents')
        .insert(content)
        .select()
        .single();
      if (error) throw createApiError(error);
      return data;
    },

    async update(containerId: string, updates: { remaining_qty?: number; unit?: string }) {
      const { data, error } = await supabase
        .from('contents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('container_id', containerId)
        .select()
        .single();
      if (error) throw createApiError(error);
      return data;
    },
  },

  // Transactions (audit log)
  transactions: {
    async create(transaction: {
      id: string;
      container_id: string;
      operation: 'ADD' | 'DEDUCT' | 'ADJUST' | 'MERGE' | 'DELETE' | 'STATUS_CHANGE';
      delta?: number;
      unit?: string;
      reason?: string;
    }) {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();
      if (error) throw createApiError(error);
      return data;
    },

    async createMany(transactions: Array<{
      id: string;
      container_id: string;
      operation: 'ADD' | 'DEDUCT' | 'ADJUST' | 'MERGE' | 'DELETE' | 'STATUS_CHANGE';
      delta?: number;
      unit?: string;
      reason?: string;
    }>) {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactions)
        .select();
      if (error) throw createApiError(error);
      return data || [];
    },

    async findFirstAdd(containerId: string) {
      const { data, error } = await supabase
        .from('transactions')
        .select('delta')
        .eq('container_id', containerId)
        .eq('operation', 'ADD')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw createApiError(error);
      return data;
    },
  },

  // Unit Conversions
  conversions: {
    async find(fromUnit: string, toUnit: string) {
      if (fromUnit === toUnit) return { factor: 1 };

      // Try direct conversion
      const { data: direct, error: directError } = await supabase
        .from('global_unit_conversions')
        .select('factor')
        .eq('from_unit', fromUnit)
        .eq('to_unit', toUnit)
        .single();

      if (direct) return direct;

      // Try reverse conversion
      const { data: reverse, error: reverseError } = await supabase
        .from('global_unit_conversions')
        .select('factor')
        .eq('from_unit', toUnit)
        .eq('to_unit', fromUnit)
        .single();

      if (reverse) return { factor: 1 / reverse.factor };

      return null;
    },

    async convert(quantity: number, fromUnit: string, toUnit: string): Promise<number | null> {
      const conversion = await this.find(fromUnit, toUnit);
      return conversion ? quantity * conversion.factor : null;
    },
  },
};

export type { PostgrestError };
