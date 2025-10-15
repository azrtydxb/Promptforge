/**
 * UI Constants for consistent theming across components
 */

// Background classes for overlay components that respect theme
export const OVERLAY_BACKGROUNDS = {
  // For dropdowns, popovers, tooltips, etc. - solid backgrounds
  // Using direct color to ensure no transparency issues
  solid: "bg-[hsl(0,0%,100%)] dark:bg-gray-900",
  
  // Alternative using CSS variable with fallback
  solidAlt: "[background:hsl(var(--card,0_0%_100%))]",
  
  // For loading overlays - semi-transparent
  overlay: "bg-background/80 backdrop-blur-sm",
  
  // For modal backdrops
  backdrop: "bg-black/50 dark:bg-black/70",
} as const;

// Consistent z-index values
export const Z_INDEX = {
  dropdown: 50,
  modal: 100,
  tooltip: 110,
  toast: 120,
} as const;

// Animation durations
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;