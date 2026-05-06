/**
 * Deterministic SVG avatar generator for Hatcher agents.
 * Generates GitHub-identicon-style avatars using the agent name as seed
 * and framework-specific accent colors.
 */

// Framework accent colors
const FRAMEWORK_COLORS: Record<string, { fill: string; bg: string }> = {
  openclaw: { fill: '#f59e0b', bg: '#1a1508' },
  hermes: { fill: '#a855f7', bg: '#140a1e' },
};

const DEFAULT_COLORS = { fill: '#06b6d4', bg: '#0d0b1a' };

/**
 * Simple deterministic hash from a string.
 * Returns an array of pseudo-random numbers derived from the input.
 */
function hashName(name: string): number[] {
  // Use a simple but effective hash: DJB2 variant
  const result: number[] = [];
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) + h + name.charCodeAt(i)) >>> 0;
  }

  // Generate enough pseudo-random values from the hash
  // Using a simple LCG (linear congruential generator) seeded from the hash
  let seed = h;
  for (let i = 0; i < 25; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    result.push(seed);
  }

  return result;
}

/**
 * Generate a deterministic, unique SVG avatar for an agent.
 * Uses a 5x5 grid with left-right symmetry (identicon style).
 * Returns a data:image/svg+xml;base64,... string.
 */
export function generateAgentAvatar(name: string, framework: string): string {
  const colors = FRAMEWORK_COLORS[framework] ?? DEFAULT_COLORS;
  const hash = hashName(name.toLowerCase().trim());

  const size = 128;
  const padding = 14;
  const gridSize = 5;
  const cellSize = (size - padding * 2) / gridSize;

  // Determine which cells are filled.
  // Only compute left half + center column; mirror for right half.
  // Grid: 5 columns (0-4). We compute cols 0,1,2 and mirror 0->4, 1->3.
  const cells: boolean[][] = [];
  for (let row = 0; row < gridSize; row++) {
    cells[row] = [];
    for (let col = 0; col < gridSize; col++) {
      if (col <= 2) {
        // Use hash values: index = row * 3 + col (15 values for the left half + center)
        const idx = row * 3 + col;
        cells[row][col] = (hash[idx] % 3) !== 0; // ~67% fill rate for a nice density
      } else {
        // Mirror: col 3 mirrors col 1, col 4 mirrors col 0
        cells[row][col] = cells[row][gridSize - 1 - col];
      }
    }
  }

  // Vary the fill opacity slightly per cell for depth
  const getOpacity = (row: number, col: number): number => {
    const idx = row * gridSize + col;
    const v = hash[idx % hash.length];
    // Range: 0.55 to 1.0
    return 0.55 + (v % 100) / 222;
  };

  // Build SVG
  let rects = '';
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (cells[row][col]) {
        const x = padding + col * cellSize;
        const y = padding + row * cellSize;
        const opacity = getOpacity(row, col).toFixed(2);
        rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="3" fill="${colors.fill}" fill-opacity="${opacity}"/>`;
      }
    }
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<rect width="${size}" height="${size}" rx="16" fill="${colors.bg}"/>`,
    `<rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="15" fill="none" stroke="${colors.fill}" stroke-opacity="0.15"/>`,
    rects,
    `</svg>`,
  ].join('');

  // Encode as base64 data URI
  if (typeof btoa === 'function') {
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
  // Node.js fallback (for SSR)
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * Get the avatar URL for an agent — uses custom avatar if set,
 * otherwise generates a deterministic one.
 */
export function getAgentAvatarUrl(
  name: string,
  framework: string,
  avatarUrl?: string | null,
): string {
  if (avatarUrl) return avatarUrl;
  return generateAgentAvatar(name, framework);
}
