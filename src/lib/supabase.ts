import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase = url && anonKey ? createClient(url, anonKey) : null

export async function syncProgress(deviceId: string, payload: unknown) {
  if (!supabase) return
  await supabase.from('learning_state').upsert({
    device_id: deviceId,
    payload,
    updated_at: new Date().toISOString(),
  })
}
