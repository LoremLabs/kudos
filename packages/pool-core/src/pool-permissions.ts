/**
 * Pure permission utilities for pool access control.
 * Callers provide the subjectHash (computed from sender subject).
 *
 * Permission format: "u:{subjectHash}:{perm}" where perm is r, w, or a (admin).
 */

export function getSimplifiedPermissions(
  permissions: string[] | null,
  subjectHash: string,
): string[] {
  if (!permissions) return [];
  return permissions
    .filter((p) => p.startsWith(`u:${subjectHash}:`))
    .map((p) => p.split(":")[2]);
}

export function canRead(permissions: string[] | null, subjectHash: string): boolean {
  const simplified = getSimplifiedPermissions(permissions, subjectHash);
  return simplified.includes("r") || simplified.includes("a");
}

export function canWrite(permissions: string[] | null, subjectHash: string): boolean {
  const simplified = getSimplifiedPermissions(permissions, subjectHash);
  return simplified.includes("w") || simplified.includes("a");
}

export function canAdmin(permissions: string[] | null, subjectHash: string): boolean {
  const simplified = getSimplifiedPermissions(permissions, subjectHash);
  return simplified.includes("a");
}

export function isPoolFrozen(config: string | null): boolean {
  if (!config) return false;
  try {
    const parsed = JSON.parse(config);
    if (parsed.frozen === true) return true;
    if (parsed.frozenDate && new Date(parsed.frozenDate) < new Date()) return true;
  } catch {
    // ignore malformed config
  }
  return false;
}

export function makeOwnerPermissions(subjectHash: string): string[] {
  return [`u:${subjectHash}:a`, `u:${subjectHash}:r`, `u:${subjectHash}:w`];
}
