/**
 * A premium color palette designed for a high-end feel.
 */

const palette = {
  richBlack: "#050505",
  charcoal: "#1A1A1A",
  luxuryGold: "#D4AF37", // A classic premium gold
  softWhite: "#F5F5F5",
  glassWhite: "rgba(255, 255, 255, 0.1)", // For frosted glass effect
  glassBorder: "rgba(255, 255, 255, 0.2)",
  deepNavy: "#0f172a",
  vibrantPurple: "#7c3aed",
};

export const Colors = {
  light: {
    text: palette.richBlack,
    background: "#FFFFFF",
    tint: palette.luxuryGold,
    card: "#F8F9FA",
    icon: palette.charcoal,
  },
  dark: {
    text: palette.softWhite,
    background: palette.richBlack,
    tint: palette.luxuryGold,
    card: palette.charcoal,
    icon: "#9BA1A6",
  },
  premium: {
    gold: palette.luxuryGold,
    glass: palette.glassWhite,
    border: palette.glassBorder,
    gradientStart: palette.deepNavy,
    gradientEnd: palette.vibrantPurple,
  },
};
