// Integration: simple admin secret stored locally after POST /admin/verify
const ADMIN_KEY_STORAGE = "carrom_admin_key";

export function getAdminKey(): string | null {
  return localStorage.getItem(ADMIN_KEY_STORAGE);
}

export function setAdminKey(key: string): void {
  localStorage.setItem(ADMIN_KEY_STORAGE, key);
}

export function clearAdminKey(): void {
  localStorage.removeItem(ADMIN_KEY_STORAGE);
}

export function isAdmin(): boolean {
  return Boolean(getAdminKey());
}
