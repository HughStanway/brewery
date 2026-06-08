/**
 * Compares two semantic version strings.
 * Returns:
 *   - negative number if a < b
 *   - positive number if a > b
 *   - 0 if a === b
 */
export function compareVersions(a: string, b: string): number {
  if (a === b) return 0;

  const cleanA = a.replace(/^v/, '');
  const cleanB = b.replace(/^v/, '');

  const [aNum, aPre] = cleanA.split('-');
  const [bNum, bPre] = cleanB.split('-');

  const aParts = aNum.split('.').map(Number);
  const bParts = bNum.split('.').map(Number);

  const maxLen = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLen; i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    if (aVal !== bVal) {
      return aVal - bVal;
    }
  }

  // If one has pre-release tag and the other doesn't
  if (!aPre && bPre) return 1;  // Release is newer than pre-release
  if (aPre && !bPre) return -1; // Pre-release is older than release

  if (aPre && bPre) {
    // Compare pre-release tags alphabetically/numerically
    return aPre.localeCompare(bPre, undefined, { numeric: true, sensitivity: 'base' });
  }

  return 0;
}
