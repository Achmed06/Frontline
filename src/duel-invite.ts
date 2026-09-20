/** Public invitation data only. Session credentials never belong in a URL. */
export function inviteCode(search: string): string | null {
  const code = new URLSearchParams(search).get('room')?.trim().toUpperCase();
  return code && /^[A-F0-9]{6}$/.test(code) ? code : null;
}
export function inviteUrl(page: string, code: string): string {
  if (!/^[A-F0-9]{6}$/.test(code)) throw Error('Ungültiger Raumcode.');
  const url = new URL('./duel.html', page);
  url.searchParams.set('room', code);
  return url.href;
}
