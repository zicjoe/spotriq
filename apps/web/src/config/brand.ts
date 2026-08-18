export const BRAND = {
  name: "Spotriq",
  descriptor: "BSC financial-agent marketplace",
  tagline: "Know what your money needs. Spot the right agent for it.",
  shortTagline: "Spot the right agent for your money.",
  description: "Discover, compare and safely activate specialist financial agents on BSC.",
  trustCue: "Read-only until you choose to activate an agent.",
  copyright: `© ${new Date().getFullYear()} Spotriq. All rights reserved.`,
} as const;

export function pageTitle(page?: string) {
  return page ? `${page} | ${BRAND.name}` : `${BRAND.name} — ${BRAND.descriptor}`;
}
