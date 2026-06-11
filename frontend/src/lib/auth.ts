import { useSupabase } from "./config";
import { requireSupabase } from "./supabase";

const ADMIN_KEY_STORAGE = "carrom_admin_key";

// FastAPI admin secret (localStorage)
export function getAdminKey(): string | null {
  return localStorage.getItem(ADMIN_KEY_STORAGE);
}

export function setAdminKey(key: string): void {
  localStorage.setItem(ADMIN_KEY_STORAGE, key);
}

export function clearAdminKey(): void {
  localStorage.removeItem(ADMIN_KEY_STORAGE);
}

export function isFastApiAdmin(): boolean {
  return Boolean(getAdminKey());
}

// Supabase Auth
export async function signInAdmin(email: string, password: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const admin = await checkSupabaseAdmin();
  if (!admin) {
    await sb.auth.signOut();
    throw new Error("This account is not registered as a tournament admin");
  }
}

export async function signOutAdmin(): Promise<void> {
  if (useSupabase()) {
    const sb = requireSupabase();
    const { error } = await sb.auth.signOut({ scope: "local" });
    if (error) throw error;
    return;
  }
  clearAdminKey();
}

export async function checkSupabaseAdmin(): Promise<boolean> {
  const sb = requireSupabase();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session?.user.email) return false;

  const { data, error } = await sb.rpc("check_admin_email", {
    check_email: session.user.email,
  });

  if (error) return false;
  return Boolean(data);
}

export async function isAdmin(): Promise<boolean> {
  if (useSupabase()) return checkSupabaseAdmin();
  return isFastApiAdmin();
}

export function usesSupabaseAuth(): boolean {
  return useSupabase();
}
