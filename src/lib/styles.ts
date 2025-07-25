import { type ClassValue } from "clsx"
import { cn } from "./utils"

// =============================================================================
// DELL TECHNOLOGIES DESIGN SYSTEM - STANDARDIZED TAILWIND PATTERNS
// =============================================================================

/**
 * STANDARDIZED COLOR PATTERNS WITH PROFESSIONAL INTERACTIONS
 * Use these instead of hardcoded colors
 */
export const dellColors = {
  // Primary Dell Blue with enhanced interactions
  primary: {
    bg: "bg-[hsl(var(--primary))]",
    text: "text-[hsl(var(--primary))]",
    border: "border-[hsl(var(--primary))]",
    hover: "hover:bg-[hsl(var(--primary))]/10 hover:shadow-sm transition-all duration-200",
    selected: "bg-[hsl(var(--primary))]/20 border-l-4 border-[hsl(var(--primary))] shadow-sm",
    gradient: "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary))]",
  },
  // Secondary/Neutral with subtle interactions
  neutral: {
    bg: "bg-dell-gray-100",
    text: "text-dell-gray-600",
    border: "border-dell-gray-300",
    hover: "hover:bg-dell-gray-50 hover:shadow-sm transition-all duration-150",
  },
  // Interactive states with professional polish
  interactive: {
    hover: "hover:bg-[hsl(var(--primary))]/10 hover:text-[hsl(var(--primary))] hover:shadow-md hover:scale-[1.02] transition-all duration-200",
    focus: "focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2 focus:outline-none",
    active: "active:bg-[hsl(var(--primary))] active:text-white active:scale-[0.98] transition-all duration-100",
    disabled: "disabled:cursor-not-allowed disabled:hover:scale-100",
  },
  // Professional shadow system
  shadows: {
    soft: "shadow-sm hover:shadow-md transition-shadow duration-200",
    medium: "shadow-md hover:shadow-lg transition-shadow duration-200",
    large: "shadow-lg hover:shadow-xl transition-shadow duration-200",
    glow: "hover:shadow-lg transition-all duration-200",
  }
} as const

/**
 * PROFESSIONAL COMPONENT PATTERNS WITH ENHANCED INTERACTIONS
 * All components should use these patterns for consistent professional appearance
 */
export const dellComponents = {
  // Enhanced Cards with sophisticated hover effects
  card: {
    base: "rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200",
    interactive: "cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-[hsl(var(--primary))]/30 transition-all duration-200 group",
    selected: "ring-2 ring-[hsl(var(--primary))] ring-offset-2 shadow-lg scale-[1.01]",
    premium: "bg-gradient-to-br from-white to-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/30 hover:shadow-xl",
  },
  
  // Professional Navigation with smooth animations (Hyper theme)
  navItem: {
    base: "flex items-center gap-1.5 rounded-md px-3 py-2.5 mr-3 transition-all duration-200 group relative",
    default: "text-primary-foreground hover:bg-gradient-to-r hover:from-[#6379c3]/10 hover:to-[#546ee5]/10 hover:text-[#546ee5]",
    active: "bg-gradient-to-r from-[#6379c3]/20 to-[#546ee5]/20 text-[#546ee5] font-medium",
    indicator: "",
  },
  
  // Enhanced Buttons with professional interactions (Hyper theme)
  button: {
    primary: "bg-gradient-to-r from-[#6379c3] to-[#546ee5] hover:opacity-90 text-white transition-all duration-200 shadow-sm hover:shadow-md",
    secondary: "bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary))]/90 text-[hsl(var(--secondary-foreground))] transition-all duration-200",
    ghost: "hover:bg-gradient-to-r hover:from-[#6379c3]/10 hover:to-[#546ee5]/10 hover:text-[#546ee5] transition-all duration-200",
    gradient: "bg-gradient-to-r from-[hsl(var(--accent-gradient-start))] to-[hsl(var(--accent-gradient-end))] hover:opacity-90 text-white transition-all duration-200 shadow-sm hover:shadow-md",
    // Icon buttons for overlays and sticky notes
    iconOverlay: "rounded-full bg-white text-foreground hover:bg-gray-50 hover:shadow-md transition-all duration-200 hover:scale-110 border border-gray-300",
    iconSolid: "rounded-full bg-gradient-to-r from-[#6379c3] to-[#546ee5] text-white hover:opacity-90 hover:shadow-lg transition-all duration-200 hover:scale-110",
  },
  
  // Professional Form elements with enhanced feedback
  input: {
    base: "border border-dell-gray-300 rounded-md px-3 py-2 transition-all duration-200 hover:border-[hsl(var(--primary))]/40",
    focus: "focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))] focus:outline-none focus:shadow-lg",
    error: "border-red-500 focus:ring-red-500 hover:border-red-400",
    success: "border-green-500 focus:ring-green-500 hover:border-green-400",
  },
  
  // Enhanced Layout with professional spacing
  layout: {
    container: "px-4 py-4 transition-all duration-200",
    section: "space-y-6 animate-in fade-in duration-300",
    pageHeader: "flex items-center justify-between mb-6 pb-4 border-b border-dell-gray-200",
    sidebar: "w-64 bg-[hsl(var(--primary))] text-white shadow-xl",
  },
  
  // Professional Status indicators with animations
  status: {
    dot: "w-2 h-2 rounded-full bg-[hsl(var(--primary))] animate-pulse",
    badge: "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/30 transition-colors duration-200",
    progress: "h-2 bg-dell-gray-200 rounded-full overflow-hidden",
    progressBar: "h-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary))] transition-all duration-500 ease-out",
  },
  
  // Loading states for professional feedback
  loading: {
    spinner: "animate-spin h-4 w-4 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full",
    skeleton: "animate-pulse bg-dell-gray-200 rounded",
    overlay: "absolute inset-0 bg-white flex items-center justify-center",
  },
  
  // Tooltips and feedback
  tooltip: {
    base: "absolute z-50 px-2 py-1 text-xs text-white bg-dell-gray-900 rounded shadow-lg hidden group-hover:block transition-all duration-200",
    arrow: "absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-dell-gray-900",
  }
} as const

/**
 * COMPONENT BUILDERS - Use these to ensure consistency
 */

/**
 * Enhanced Dell card pattern with professional interactions
 */
export function dellCard(variant: 'static' | 'interactive' | 'selected' | 'premium' = 'static', className?: ClassValue) {
  return cn(
    dellComponents.card.base,
    variant === 'interactive' && dellComponents.card.interactive,
    variant === 'selected' && dellComponents.card.selected,
    variant === 'premium' && dellComponents.card.premium,
    className
  )
}

/**
 * Professional Dell navigation item with smooth animations
 */
export function dellNavItem(isActive: boolean = false, withIndicator: boolean = true, className?: ClassValue) {
  return cn(
    dellComponents.navItem.base,
    isActive ? dellComponents.navItem.active : dellComponents.navItem.default,
    withIndicator && dellComponents.navItem.indicator,
    className
  )
}

/**
 * Enhanced Dell button variants with professional interactions
 */
export function dellButton(variant: 'primary' | 'secondary' | 'ghost' | 'gradient' = 'primary', className?: ClassValue) {
  return cn(
    "inline-flex items-center justify-center rounded-sm px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#546ee5]",
    dellComponents.button[variant],
    "disabled:opacity-50 disabled:cursor-not-allowed",
    className
  )
}

/**
 * Dell icon button for actions on cards and overlays
 */
export function dellIconButton(variant: 'overlay' | 'solid' = 'overlay', size: 'sm' | 'md' | 'lg' = 'md', className?: ClassValue) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-10 h-10'
  }
  
  const baseClasses = "inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:cursor-not-allowed"
  
  return cn(
    baseClasses,
    sizeClasses[size],
    variant === 'overlay' ? dellComponents.button.iconOverlay : dellComponents.button.iconSolid,
    className
  )
}

/**
 * Professional Dell input with enhanced focus states
 */
export function dellInput(state: 'default' | 'error' | 'success' = 'default', className?: ClassValue) {
  return cn(
    dellComponents.input.base,
    state === 'error' && dellComponents.input.error,
    state === 'success' && dellComponents.input.success,
    state === 'default' && dellComponents.input.focus,
    className
  )
}

/**
 * Enhanced folder item with subtle color changes
 */
export function dellFolderItem(isSelected: boolean, isDefault?: boolean, className?: ClassValue) {
  return cn(
    "flex items-center py-2 px-3 cursor-pointer transition-colors duration-200",
    // Base text color
    "text-gray-700",
    isSelected
      ? "text-[#546ee5] font-semibold"
      : "hover:text-[#546ee5]",
    isDefault && !isSelected && "text-[#546ee5] font-medium",
    className
  )
}

/**
 * Sticky note style for prompt cards
 */
export function stickyNoteCard(color: 'yellow' | 'blue' | 'green' | 'pink' | 'orange' = 'yellow', className?: ClassValue) {
  const colorClasses = {
    yellow: "bg-yellow-100 border-yellow-200",
    blue: "bg-[hsl(var(--primary))]/20 border-[hsl(var(--primary))]/30",
    green: "bg-green-100 border-green-200",
    pink: "bg-pink-100 border-pink-200",
    orange: "bg-orange-100 border-orange-200"
  }
  
  return cn(
    // Base sticky note styling - compact post-it size
    "relative transform transition-all duration-200 ease-in-out",
    "border-2 rounded-sm p-3",
    "w-full max-w-sm sm:w-80 md:w-96 aspect-square", // Responsive post-it note dimensions
    "shadow-lg hover:shadow-xl",
    // Slight rotation for authentic look
    "rotate-1 hover:rotate-0",
    // Hover effects
    "hover:scale-105 hover:z-10",
    // Color scheme
    colorClasses[color],
    // Tape effect at top
    "before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2",
    "before:w-6 before:h-3 before:bg-gray-200 before:rounded-sm before:shadow-sm",
    className
  )
}

/**
 * Professional loading spinner
 */
export function dellSpinner(size: 'sm' | 'md' | 'lg' = 'md', className?: ClassValue) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-6 w-6'
  }
  
  return cn(
    dellComponents.loading.spinner,
    sizeClasses[size],
    className
  )
}

/**
 * Professional status badge with hover effects
 */
export function dellBadge(variant: 'default' | 'success' | 'warning' | 'error' = 'default', className?: ClassValue) {
  const variants = {
    default: 'bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/30',
    success: 'bg-green-100 text-green-800 hover:bg-green-200',
    warning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    error: 'bg-red-100 text-red-800 hover:bg-red-200'
  }
  
  return cn(
    "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors duration-200",
    variants[variant],
    className
  )
}

/**
 * Professional tooltip component
 */
export function dellTooltip(position: 'top' | 'bottom' | 'left' | 'right' = 'top', className?: ClassValue) {
  const positions = {
    top: '-top-8 left-1/2 transform -translate-x-1/2',
    bottom: '-bottom-8 left-1/2 transform -translate-x-1/2',
    left: 'top-1/2 -left-20 transform -translate-y-1/2',
    right: 'top-1/2 -right-20 transform -translate-y-1/2'
  }
  
  return cn(
    dellComponents.tooltip.base,
    positions[position],
    className
  )
}

/**
 * LEGACY FUNCTIONS - For backward compatibility
 * TODO: Migrate all components to use dellComponents patterns
 */
export function cardHover(className?: ClassValue) {
  return dellCard('interactive', className)
}

export function folderItem(isSelected: boolean, isDefault?: boolean, className?: ClassValue) {
  return dellFolderItem(isSelected, isDefault, className)
}

export function containerPadding(className?: ClassValue) {
  return cn(dellComponents.layout.container, className)
}

export function pageLayout(className?: ClassValue) {
  return cn("-m-6 lg:-m-8", className)
}

export function sectionSpacing(className?: ClassValue) {
  return cn(dellComponents.layout.section, className)
}

/**
 * USAGE EXAMPLES:
 *
 * // Cards
 * <div className={dellCard('interactive', "mb-4")}>
 *
 * // Navigation
 * <nav className={dellNavItem(isActive)}>
 *
 * // Buttons
 * <button className={dellButton('primary')}>
 *
 * // Direct color usage
 * <div className={dellColors.primary.bg}>
 *
 * // Status indicators
 * <span className={dellComponents.status.dot} />
 */