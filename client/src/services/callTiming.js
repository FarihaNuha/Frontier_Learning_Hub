export function incomingLifetime(data) {
  // Server-relative duration is independent of a phone's date/time setting.
  const relative = Number(data.ringForMs);
  if (data.ringForMs != null && Number.isFinite(relative)) return Math.max(0, Math.min(45000, relative));
  const expiry = Number(data.expiresAt);
  if (!Number.isFinite(expiry)) return 45000;
  const sent = Number(data.serverTime);
  return Math.max(0, Math.min(45000, expiry - (Number.isFinite(sent) ? sent : Date.now())));
}
