export function useSupabase(): boolean {
  if (import.meta.env.VITE_USE_FASTAPI === "true") return false;
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function useFastApi(): boolean {
  return !useSupabase();
}
