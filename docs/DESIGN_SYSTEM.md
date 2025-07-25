# Promptforge Design System

This document outlines the comprehensive design system for the Promptforge application, based on the Hyper Admin template (Creative theme). This guide ensures consistent visual design and user experience across the entire application.

## Core Design Principles

1. **Professional & Clean** - Enterprise-grade appearance with refined aesthetics
2. **Consistent** - Uniform design language across all components
3. **Accessible** - WCAG 2.1 AA compliant with high contrast ratios
4. **Modern** - Contemporary design with subtle shadows and smooth transitions
5. **Component-First** - Reusable patterns based on Hyper's proven design system
6. **Performance-Focused** - Optimized animations and transitions for smooth UX
7. **Widget-Rich** - Comprehensive set of dashboard widgets and components

## Color Palette

### Primary Brand Colors

The color system is based on HSL values for easy theme customization and dark mode support.

| Color | HSL Value | Hex | RGB | Usage |
|-------|-----------|-----|-----|-------|
| **Primary (Indigo)** | `235 84% 71%` | `#727cf5` | `114, 124, 245` | Primary actions, active states, links |
| **Primary Hover** | `235 84% 61%` | - | - | Darker shade for hover states |
| **Primary Light** | `235 84% 81%` | - | - | Lighter shade for backgrounds |
| **Primary Foreground** | `0 0% 100%` | `#FFFFFF` | `255, 255, 255` | Text on primary backgrounds |

### Neutral Colors

| Color | HSL Value | Hex | Usage |
|-------|-----------|-----|-------|
| **Background** | `0 0% 100%` | `#FFFFFF` | Main page background |
| **Secondary** | `216 38% 97%` | `#fafbfe` | Secondary backgrounds (Hyper body-bg) |
| **Card** | `0 0% 100%` | `#FFFFFF` | Card backgrounds |
| **Card Foreground** | `214 17% 24%` | `#343a40` | Card text color |
| **Foreground** | `214 17% 24%` | `#343a40` | Primary text |
| **Muted Foreground** | `215 12% 45%` | `#6c757d` | Muted text |

### Semantic Colors

| Color | HSL Value | Hex | Usage |
|-------|-----------|-----|-------|
| **Success** | `160 70% 45%` | `#0acf97` | Success states, confirmations |
| **Warning** | `45 95% 64%` | `#ffbc00` | Warnings, cautions |
| **Destructive** | `354 70% 67%` | `#fa5c7c` | Errors, destructive actions |
| **Info** | `188 78% 41%` | `#39afd1` | Information, highlights |

### UI Element Colors

| Element | HSL Value | Hex | Usage |
|---------|-----------|-----|-------|
| **Border** | `0 0% 90%` | - | Default borders |
| **Input** | `0 0% 95%` | - | Input backgrounds |
| **Ring** | `235 84% 71%` | `#727cf5` | Focus rings |
| **Menu Background** | `0 0% 100%` | `#FFFFFF` | Sidebar background |
| **Menu Item** | `215 12% 45%` | - | Menu item text |
| **Menu Item Hover** | `235 84% 71%` | `#727cf5` | Menu item hover state |
| **Menu Item Active** | `235 84% 71%` | `#727cf5` | Active menu item |
| **Topbar Background** | `0 0% 100%` | `#FFFFFF` | Topbar background |
| **Topbar Item** | `215 12% 45%` | - | Topbar item color |
| **Topbar Item Hover** | `235 84% 71%` | `#727cf5` | Topbar item hover |

### Dark Mode Colors

| Color | HSL Value | Hex | Usage |
|-------|-----------|-----|-------|
| **Background** | `218 13% 18%` | `#313a46` | Dark mode background |
| **Foreground** | `210 17% 82%` | `#cfd5de` | Dark mode text |
| **Card** | `218 13% 23%` | `#37404a` | Dark mode cards |
| **Menu Background** | `218 13% 18%` | `#313a46` | Sidebar background |

## Typography

### Font Stack

The application uses Nunito as the primary font family, loaded from Google Fonts with multiple weights.

```css
/* Primary Font Family */
font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

/* Monospace Font Family */
font-family: 'Geist Mono', 'Monaco', 'Consolas', 'Courier New', monospace;
```

#### Font Weights
- Light: 300
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

### Type Scale

| Size | Value | Usage |
|------|-------|-------|
| **text-xs** | `0.75rem (12px)` | Captions, labels |
| **text-sm** | `0.875rem (14px)` | Body small, buttons |
| **text-base** | `1rem (16px)` | Body default |
| **text-lg** | `1.125rem (18px)` | Card titles |
| **text-xl** | `1.25rem (20px)` | Section headers |
| **text-2xl** | `1.5rem (24px)` | Page sections |
| **text-3xl** | `1.875rem (30px)` | Page titles |
| **text-4xl** | `2.25rem (36px)` | Hero text |

#### Component-specific sizes
- **Menu Item**: `0.9375rem (15px)` - Sidebar menu items
- **Menu Icon**: `18px` - Sidebar menu icons
- **Header Title**: `1rem (16px)` - Card headers (uppercase)
- **Dropdown Header**: `0.875rem (14px)` - Dropdown section headers
- **Badge**: `0.75rem (12px)` - Badge text
- **Widget Icon**: `20px` - Widget icon size
- **Timeline Icon**: `20px` - Timeline widget icons
- **Inbox Item Image**: `40px` - Inbox widget avatars
- **Chat Avatar**: `42px` - Chat widget avatars

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| **Light** | `300` | Rarely used |
| **Normal** | `400` | Body text |
| **Medium** | `500` | Emphasis |
| **Semibold** | `600` | Headings |
| **Bold** | `700` | Strong emphasis |

## Spacing System

### Base Unit
Based on Hyper's $spacer: 1.5rem (24px) system.

| Space | Value | Pixels | Usage |
|-------|-------|--------|-------|
| **space-0** | `0` | `0px` | No spacing |
| **space-1** | `0.25rem` | `4px` | Tight spacing |
| **space-2** | `0.5rem` | `8px` | Small spacing |
| **space-3** | `0.75rem` | `12px` | Medium spacing |
| **space-4** | `1rem` | `16px` | Default spacing |
| **space-5** | `1.25rem` | `20px` | Large spacing |
| **space-6** | `1.5rem` | `24px` | Base spacer - Extra spacing |
| **space-8** | `2rem` | `32px` | Section spacing |
| **space-10** | `2.5rem` | `40px` | Large sections |
| **space-12** | `3rem` | `48px` | Hero sections |
| **space-16** | `4rem` | `64px` | Page sections |

### Component-specific spacing
- **Menu Item Padding**: `10px 20px`
- **Card Padding**: `1.5rem (24px)`
- **Page Content**: `1.5rem (24px)`
- **Sidebar Width**: `260px` (70px collapsed)

## Layout Dimensions

### Fixed Measurements

Based on Hyper's layout system with fixed sidebar and flexible content area.

| Dimension | Value | Usage |
|-----------|-------|-------|
| **Sidebar Width** | `260px` | Default sidebar ($leftbar-width) |
| **Sidebar Width SM** | `70px` | Condensed sidebar ($leftbar-width-sm) |
| **Sidebar Width MD** | `160px` | Compact sidebar ($leftbar-width-md) |
| **Topbar Height** | `70px` | Main header height ($topbar-height) |
| **Footer Height** | `60px` | Footer height ($footer-height) |
| **Logo LG Height** | `24px` | Large logo height |
| **Logo SM Height** | `16px` | Small logo height |
| **Menu Item Icon Size** | `18px` | Menu icon size |
| **Menu Condensed Width** | `260px` | Condensed menu expanded width |
| **Dropdown Large Width** | `320px` | Large dropdown width |
| **Condensed Menu Height** | `1800px` | Minimum height for condensed mode |
| **Switch Width** | `56px` | Custom switch width |
| **Switch Height** | `24px` | Custom switch height |
| **Social Icon Size** | `32px` | Social media icon dimensions |
| **Ribbon Width** | `75px` | Corner ribbon dimensions |
| **Step Item Size** | `8px` | Step indicator size |

### Layout Modes

1. **Default**: Fixed sidebar (260px) with scrollable content
2. **Condensed**: Collapsed sidebar (70px) with hover expansion
3. **Compact**: Medium sidebar (160px) with icon + text
4. **Detached**: Floating sidebar with rounded corners
5. **Boxed**: Centered layout with max-width container

### Container Widths

| Container | Value | Usage |
|-----------|-------|-------|
| **Container Max** | `1440px` | Main content width |
| **Boxed Layout** | `1300px` | Boxed layout width ($boxed-layout-width) |
| **Detached Max** | `95%` | Detached mode width |
| **App Search Max** | `320px` | Search bar maximum width |

## Visual Effects

### Shadows

```css
/* Box Shadows - Hyper style */
--shadow-sm: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
--shadow: 0px 0px 35px 0px rgba(154, 161, 171, 0.15);
--shadow-lg: 0 1rem 3rem rgba(0, 0, 0, 0.175);

/* Component shadows */
--btn-shadow: 0 2px 0 rgba(0, 0, 0, 0.045);
--btn-primary-shadow: 0 1px 2px rgba(114, 124, 245, 0.5);
--dropdown-shadow: var(--shadow);
--modal-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);

/* Card shadow (default) */
box-shadow: 0px 0px 35px 0px rgba(154, 161, 171, 0.15);
```

### Border Radius

```css
/* Border Radius Scale */
rounded-sm   /* 0.25rem (4px) - Small components */
rounded      /* 0.5rem (8px) - Default radius */
rounded-lg   /* 0.75rem (12px) - Large components */
rounded-full /* 9999px - Pills, avatars */

/* Component-specific radius */
--card-radius: 0.5rem;
--button-radius: 0.25rem;
--input-radius: 0.25rem;
--modal-radius: 0.5rem;
```

## Transitions & Animations

### Standard Durations

| Duration | Value | Usage |
|----------|-------|-------|
| **duration-150** | `150ms` | Fast transitions |
| **duration-250** | `250ms` | Default transitions (Hyper base) |
| **duration-350** | `350ms` | Slow transitions |

### Common Transitions

```css
/* Default Transition */
transition: all 0.15s ease-in-out;

/* Color Transition */
transition: background-color 0.15s ease-in-out, 
            color 0.15s ease-in-out, 
            border-color 0.15s ease-in-out;

/* Transform Transition */
transition: transform 0.15s;

/* Component transitions */
--transition-base: all 0.25s ease-in-out;

/* Animation keyframes */
@keyframes DropDownSlide {
  0% { transform: translateY(10px); }
  100% { transform: translateY(0); }
}

/* Animation easing */
--ease-in-out-sine: cubic-bezier(0.37, 0, 0.63, 1);
--ease-out-back: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

## Component Patterns

### Avatar Sizes

```css
/* Avatar dimensions */
.avatar-xs { height: 1.5rem; width: 1.5rem; }    /* 24px */
.avatar-sm { height: 3rem; width: 3rem; }        /* 48px */
.avatar-md { height: 4.5rem; width: 4.5rem; }    /* 72px */
.avatar-lg { height: 6rem; width: 6rem; }        /* 96px */
.avatar-xl { height: 7.5rem; width: 7.5rem; }    /* 120px */

.avatar-title {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: hsl(var(--primary));
  color: white;
  font-weight: 600;
  height: 100%;
  width: 100%;
}
```

### Badges

```css
/* Badge variations */
.badge {
  padding: 0.25em 0.45em;
  font-size: 0.75rem;
  font-weight: 500;
  vertical-align: middle;
}

.badge-lg {
  padding: 0.5em 0.9em;
  font-size: 0.85rem;
}

/* Soft badges */
.badge-soft-primary {
  color: hsl(var(--primary));
  background-color: hsl(var(--primary) / 0.1);
}

/* Outline badges */
.badge-outline-primary {
  color: hsl(var(--primary));
  background-color: transparent;
  border: 1px solid hsl(var(--primary));
}
```

### Buttons

Buttons follow Hyper's design patterns with box shadows and hover effects.

#### Primary Button
```css
.btn-primary {
  background: hsl(var(--primary));
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  font-weight: 500;
  transition: all 0.15s ease-in-out;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.045), 
              0 1px 2px rgba(114, 124, 245, 0.5);
}

.btn-primary:hover {
  background: hsl(var(--primary) / 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn-primary:active {
  transform: scale(0.98);
}
```

#### Soft Buttons
```css
.btn-soft-primary {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.1);
  border: transparent;
}

.btn-soft-primary:hover {
  color: white;
  background: hsl(var(--primary));
}
```

### Cards

Cards use Hyper's signature box shadow for depth.

```css
.card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0px 0px 35px 0px rgba(154, 161, 171, 0.15);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.card-header {
  padding: 1.5rem;
  border-bottom: 1px solid hsl(var(--border));
}

.header-title {
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  font-size: 1rem;
  font-weight: 600;
  margin-top: 0;
}
```

### Forms

```css
.form-control {
  background: hsl(var(--input));
  border: 1px solid hsl(var(--border));
  border-radius: 0.25rem;
  padding: 0.75rem;
  font-size: 1rem;
  transition: all 0.15s ease-in-out;
}

.form-control:focus {
  background: white;
  border-color: hsl(var(--primary));
  outline: none;
  box-shadow: 0 0 0 0.2rem hsl(var(--primary) / 0.25);
}

.form-label {
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: hsl(var(--foreground));
}

/* Form control light variant */
.form-control-light {
  background-color: hsl(var(--light)) !important;
  border: 1px solid hsl(var(--border));
}

/* Password visibility toggle */
.password-eye {
  cursor: pointer;
  font-size: 16px;
}

/* Form heights */
--input-height: 2.5rem;     /* 40px */
--input-height-sm: 2rem;    /* 32px */
--input-height-lg: 3rem;    /* 48px */

/* Select elements */
select.form-control:not([size]):not([multiple]) {
  height: 2.5rem;
}

select.form-control-sm:not([size]):not([multiple]) {
  height: 2rem;
}
```

### Tables

```css
/* Table styles */
.table {
  --table-bg: transparent;
}

.table-centered th,
.table-centered td {
  vertical-align: middle !important;
}

.table-nowrap th,
.table-nowrap td {
  white-space: nowrap;
}

/* Table action icons */
.action-icon {
  color: hsl(var(--muted-foreground));
  font-size: 1.2rem;
  display: inline-block;
  padding: 0 3px;
}

.action-icon:hover {
  color: hsl(var(--foreground));
}

/* Table user avatar */
.table-user img {
  height: 30px;
  width: 30px;
  border-radius: 50%;
}
```

### Modals

```css
.modal-content {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  border: none;
}

.modal-header {
  border-bottom: 1px solid hsl(var(--border));
  padding: 1.5rem;
}

.modal-title {
  margin-top: 0;
  color: inherit;
  font-weight: 600;
}

.modal-body {
  padding: 1.5rem;
}

/* Modal Variations */
.modal-filled .modal-header {
  background-color: rgba(255, 255, 255, 0.07);
  border: none;
}

/* Modal variations */
.modal-full-width {
  width: 95%;
  max-width: none;
}

.modal-right {
  position: absolute;
  right: 0;
  margin: 0;
  height: 100%;
  transform: translate(25%, 0);
}

.modal.show .modal-right {
  transform: translate(0, 0);
}
```

### Topbar

```css
/* Topbar structure */
.navbar-custom {
  background: hsl(var(--background));
  box-shadow: var(--shadow);
  min-height: 70px;
  position: sticky;
  top: 0;
  z-index: 1000;
  border-bottom: 1px solid hsl(var(--border));
}

/* Topbar search */
.app-search .form-control {
  background-color: hsl(var(--muted));
  border: none;
  height: 40px;
  padding-left: 40px;
  max-width: 320px;
}

.app-search .search-icon {
  position: absolute;
  left: 10px;
  top: 0;
  font-size: 20px;
  line-height: 38px;
  color: hsl(var(--muted-foreground));
}

/* User dropdown */
.nav-user {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0 1px solid hsl(var(--border));
  background-color: hsl(var(--muted));
  min-height: 70px;
}

/* Notification badge */
.noti-icon-badge {
  position: absolute;
  top: 22px;
  right: 1px;
  border-radius: 50%;
  height: 7px;
  width: 7px;
  background-color: hsl(var(--destructive));
}
```

### Footer

```css
/* Footer structure */
.footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  color: hsl(var(--foreground));
  transition: all 0.25s ease-in-out;
  border-top: 1px solid hsl(var(--border));
}

.footer-links a {
  color: hsl(var(--foreground));
  margin-left: 24px;
  transition: all .4s;
}

.footer-links a:hover {
  color: hsl(var(--primary));
}

.footer-links a:first-of-type {
  margin-left: 0;
}

/* Footer alt (authentication pages) */
.footer-alt {
  border: none;
  text-align: center;
  justify-content: center;
}
```

### Page Title Box

```css
/* Page title */
.page-title-box {
  padding: 1.5rem 0;
}

.page-title-box .page-title {
  font-size: 18px;
  margin: 0;
  line-height: 75px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.page-title-box .page-title-right {
  float: right;
  margin-top: 20px;
}

.page-title-box .breadcrumb {
  padding-top: 8px;
}

/* Small page title box */
.page-title-box-sm .page-title {
  line-height: 1 !important;
  margin-bottom: 25px;
}

.page-title-box-sm .page-title-right {
  float: right;
  margin-top: 0;
}

.page-title-box-sm .breadcrumb {
  padding-top: 0;
  margin-top: -3px !important;
}

/* Text title */
.text-title {
  color: hsl(var(--muted-foreground));
}

.text-title:hover {
  color: hsl(var(--foreground));
}
```

### Horizontal Navigation (Topnav Layout)

```css
/* Topnav layout */
html[data-layout="topnav"] .navbar-custom {
  margin: 0;
  padding: 0;
  z-index: 1005;
  box-shadow: none;
}

html[data-layout="topnav"] .content-page {
  margin-left: 0;
  padding: 0 0 60px;
}

/* Topnav container */
.topnav {
  width: 100%;
  z-index: 1000;
  position: sticky;
  top: 70px;
  background: hsl(var(--menu-bg));
  box-shadow: var(--shadow);
  border-top: 1px solid hsl(var(--border));
}

.topnav .navbar-nav .nav-link {
  display: flex;
  align-items: center;
  position: relative;
  font-size: 0.9375rem;
  padding: 10px 40px;
}

.topnav .navbar-nav .nav-link i {
  font-size: 18px;
  margin-right: 13.5px;
}

/* Arrow down for dropdowns */
.arrow-down {
  display: inline-block;
  margin-left: 30px;
  font-size: 17.55px;
}

.arrow-down:before {
  content: "\F0140";
  font-family: "Material Design Icons";
}

/* Mobile toggle button */
.navbar-toggle {
  display: none;
  position: relative;
  cursor: pointer;
  float: left;
  padding: 0;
  background-color: transparent;
  color: hsl(var(--foreground));
  border: none;
}

.navbar-toggle .lines {
  width: 25px;
  display: block;
  position: relative;
  height: 16px;
  transition: all 0.5s ease;
}

.navbar-toggle span {
  height: 2px;
  width: 100%;
  background-color: hsl(var(--foreground));
  display: block;
  margin-bottom: 5px;
  transition: transform 0.5s ease;
}

/* Open state */
.navbar-toggle.open span:first-child {
  top: 7px;
  transform: rotate(45deg);
}

.navbar-toggle.open span:nth-child(2) {
  visibility: hidden;
}

.navbar-toggle.open span:last-child {
  width: 100%;
  top: 7px;
  transform: rotate(-45deg);
}
```

## Navigation Patterns

### Dropdowns

```css
/* Dropdown animations */
.dropdown-menu-animated {
  animation: DropDownSlide 0.3s both;
  box-shadow: var(--shadow);
}

/* Dropdown sizes */
.dropdown-lg {
  width: 320px;
}

/* Dropdown icon items */
.dropdown-icon-item {
  display: block;
  padding: 15px 0 9px;
  text-align: center;
  border-radius: 3px;
  transition: all 0.15s;
}

.dropdown-icon-item:hover {
  background-color: hsl(var(--muted));
}

.dropdown-icon-item img {
  height: 24px;
}
```

### Navigation Tabs

```css
/* Nav tabs */
.nav-tabs > li > a,
.nav-pills > li > a {
  color: hsl(var(--muted-foreground));
  font-weight: 600;
}

/* Bordered nav tabs */
.nav-tabs.nav-bordered {
  border-bottom: 2px solid hsl(var(--border));
}

.nav-tabs.nav-bordered .nav-item {
  margin-bottom: -1px;
}

.nav-tabs.nav-bordered a {
  border: 0;
  padding: 0.625rem 1.25rem;
}

.nav-tabs.nav-bordered a.active {
  border-bottom: 2px solid hsl(var(--primary));
}

/* Nav pills background */
.bg-nav-pills {
  background-color: hsl(var(--muted));
}
```

### Progress Bars

```css
/* Progress bar sizes */
.progress-sm { height: 5px; }
.progress-md { height: 8px; }
.progress-lg { height: 12px; }
.progress-xl { height: 15px; }
```

### Accordions

```css
/* Accordion styles */
.accordion-header {
  margin: 0;
}

.accordion-button {
  font-weight: 500;
}

/* Custom accordion */
.custom-accordion .card {
  box-shadow: none;
}

.custom-accordion .card-header {
  background-color: hsl(var(--muted));
}

.custom-accordion .accordion-arrow {
  font-size: 1.2rem;
  position: absolute;
  right: 0;
}

.custom-accordion-title {
  position: relative;
  color: hsl(var(--muted-foreground));
}

.custom-accordion-title:hover {
  color: hsl(var(--foreground));
}
```

### Pagination

```css
/* Rounded pagination */
.pagination-rounded .page-link {
  border-radius: 30px !important;
  margin: 0 3px !important;
  border: none;
}
```

### Breadcrumbs

```css
/* Breadcrumb with icons */
.breadcrumb-item + .breadcrumb-item::before {
  font-family: "Material Design Icons";
  font-size: 16px;
  line-height: 1.3;
}
```

### Tooltips

```css
/* Colored tooltips */
.primary-tooltip {
  --tooltip-bg: hsl(var(--primary)) !important;
}

.success-tooltip {
  --tooltip-bg: hsl(var(--success)) !important;
}

.warning-tooltip {
  --tooltip-bg: hsl(var(--warning)) !important;
}

.danger-tooltip {
  --tooltip-bg: hsl(var(--destructive)) !important;
}
```

### Popovers

```css
/* Popover header */
.popover-header {
  margin-top: 0;
}

/* Colored popovers */
.primary-popover {
  --popover-max-width: 200px !important;
  --popover-border-color: hsl(var(--primary)) !important;
  --popover-header-bg: hsl(var(--primary)) !important;
  --popover-header-color: white !important;
  --popover-body-padding-x: 1rem !important;
  --popover-body-padding-y: .5rem !important;
}
```

### Sidebar Menu

```css
/* Menu item styling */
.side-nav-link {
  display: block;
  padding: 10px 20px;
  color: hsl(var(--menu-item));
  font-size: 0.9375rem;
  transition: all 0.15s ease-in-out;
}

.side-nav-link:hover {
  color: hsl(var(--menu-item-hover));
}

.side-nav-link.active {
  color: hsl(var(--menu-item-active));
  font-weight: 500;
}

/* Menu icons */
.side-nav-link i {
  font-size: 18px;
  width: 30px;
  text-align: center;
  vertical-align: middle;
}
```

### Page Headers

```tsx
// Consistent page header pattern
<div className="mb-6">
  <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
    Page Title
  </h1>
  <p className="text-[hsl(var(--muted-foreground))] mt-1">
    Optional page description
  </p>
</div>
```

## Color Usage Guidelines

### Text Colors

1. **Primary Text**: Use `foreground` color for main content
2. **Secondary Text**: Use `muted-foreground` for less important text
3. **Interactive Text**: Use `primary` color for links and clickable elements
4. **White Text**: Always use on dark backgrounds (primary, success, destructive)

### Background Colors

1. **Page Background**: Use `background` (white in light mode)
2. **Section Background**: Use `secondary` for subtle differentiation
3. **Card Background**: Use `card` with shadow for elevation
4. **Interactive Backgrounds**: Use primary with opacity (e.g., `bg-[hsl(var(--primary))]/10`)

### State Colors

1. **Hover States**: Darken by 10% or add opacity
2. **Active States**: Use primary color
3. **Disabled States**: Use muted colors with reduced opacity
4. **Focus States**: Use primary color ring

## Implementation Notes

### Using Colors in Code

```css
/* Always use CSS variables */
background-color: hsl(var(--primary));
color: hsl(var(--foreground));

/* With opacity */
background-color: hsl(var(--primary) / 0.1);

/* In Tailwind */
className="bg-[hsl(var(--primary))] text-white"
className="bg-[hsl(var(--primary))]/10"
```

### Contrast Requirements

- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **Interactive Elements**: Must have visible focus indicators
- **Disabled Elements**: Can have lower contrast but must be clearly disabled

### Dark Mode Considerations

- Primary colors remain consistent between modes
- Backgrounds and text colors invert
- Shadows are reduced in dark mode
- Borders become more subtle

## Quick Reference

### Common Color Combinations

| Background | Text Color | Usage |
|------------|------------|-------|
| Primary | White | Primary buttons, active states |
| Secondary | Secondary Foreground | Subtle sections |
| Card | Card Foreground | Content cards |
| Success | White | Success messages |
| Destructive | White | Error states |
| Warning | White | Warning messages |
| Muted | Muted Foreground | Disabled states |

### Do's and Don'ts

✅ **DO**
- Use CSS variables for all colors
- Maintain consistent spacing
- Test color contrast
- Follow the type scale
- Use semantic color names

❌ **DON'T**
- Hardcode hex colors
- Use arbitrary spacing values
- Mix different shadow styles
- Create custom colors without adding to the system
- Use dark text on dark backgrounds

## Best Practices

1. **Consistency**: Always use the defined color variables instead of hardcoded values
2. **Spacing**: Use the spacing scale for all margins and paddings
3. **Typography**: Maintain hierarchy with the defined font sizes and weights
4. **Interactions**: Use consistent hover and focus states with transitions
5. **Accessibility**: Ensure proper color contrast ratios (WCAG AA standards)
6. **Responsive**: Design mobile-first with progressive enhancement
7. **Components**: Follow Hyper's component patterns for consistency
8. **Shadows**: Use the defined shadow tokens for depth and hierarchy
9. **Icons**: Use consistent icon sizes (16px for forms, 18px for navigation, 20px for topbar, 24px for feature icons, 32px for social icons)
10. **Animation**: Keep animations subtle and purposeful

## Z-Index Scale

```css
/* Z-index hierarchy */
--z-dropdown: 1000;
--z-sticky: 1020;
--z-fixed: 1030;
--z-modal-backdrop: 1040;
--z-modal: 1050;
--z-sidebar-mobile: 1055;
--z-popover: 1060;
--z-tooltip: 1070;
```

## Implementation Examples

### Creating a New Component

```tsx
// Example: Custom card component following Hyper patterns
import { cn } from '@/lib/utils';

interface CardProps {
  className?: string;
  title?: string;
  children: React.ReactNode;
}

export function Card({ className, title, children }: CardProps) {
  return (
    <div 
      className={cn(
        "bg-white rounded-lg shadow-[0px_0px_35px_0px_rgba(154,161,171,0.15)] mb-6",
        className
      )}
    >
      {title && (
        <div className="p-6 border-b border-border">
          <h3 className="text-base font-semibold uppercase tracking-wider m-0">
            {title}
          </h3>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
```

### Using Theme Colors

```tsx
// Primary button with Hyper styling
<button className="bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90 px-4 py-2 rounded shadow-[0_2px_0_rgba(0,0,0,0.045)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.1)] active:scale-[0.98] transition-all font-medium">
  Click me
</button>

// Soft button variant
<button className="bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-white px-4 py-2 rounded transition-all font-medium">
  Soft Button
</button>

// Using in styled components or CSS
const StyledButton = styled.button`
  background: hsl(var(--primary));
  color: white;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.045), 
              0 1px 2px rgba(var(--primary-rgb), 0.5);
  
  &:hover {
    background: hsl(var(--primary) / 0.9);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: scale(0.98);
  }
`;
```

## Dark Mode Considerations

While the current implementation uses a light theme, the HSL-based color system is designed to easily support dark mode:

```css
/* Dark mode color overrides */
[data-bs-theme="dark"] {
  --background: 222 17% 11%;
  --foreground: 0 0% 95%;
  --card: 222 17% 14%;
  --primary: 235 84% 71%;
  --menu-bg: 222 17% 14%;
  /* ... other dark mode colors */
}
```

## Resources

- [Hyper Admin Template](https://coderthemes.com/hyper-admin/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [HSL Color Model](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hsl)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

## Additional Hyper Components

### Help Box (Sidebar)

```css
.help-box {
  border-radius: 5px;
  padding: 20px;
  margin: 65px 25px 25px;
  position: relative;
  background-color: hsl(var(--primary) / 0.1);
}
```

### Notification List

```css
.notification-list .notify-item {
  padding: 10px 20px;
}

.notification-list .notify-item.unread-noti {
  background-color: hsl(var(--muted));
}

.notification-list .notify-icon {
  height: 36px;
  width: 36px;
  line-height: 36px;
  text-align: center;
  border-radius: 50%;
  color: white;
}
```

### Chat Widget

```css
/* Chat user backgrounds */
--chat-primary-user-bg: hsl(var(--primary) / 0.1);
--chat-secondary-user-bg: hsl(var(--muted));

/* Chat conversation */
.conversation-list {
  list-style: none;
  padding: 0 15px;
}

.chat-avatar {
  width: 42px;
  border-radius: 100%;
}

.ctext-wrap {
  background: hsl(var(--muted));
  border-radius: 3px;
  padding: 12px;
  position: relative;
}

/* Chat bubble arrow */
.ctext-wrap:after {
  left: -11px;
  top: 0;
  border: 6px solid transparent;
  border-top-color: hsl(var(--muted));
  border-right-color: hsl(var(--muted));
  content: " ";
  position: absolute;
}
```

### Hero Gradient

```css
/* Hero section gradient */
--hero-bg: linear-gradient(to bottom, #6379c3, #546ee5);
```

### Widgets

```css
/* Widget flat */
.widget-flat {
  position: relative;
  overflow: hidden;
}

.widget-icon {
  color: hsl(var(--primary));
  font-size: 20px;
  background-color: hsl(var(--primary) / 0.25);
  height: 40px;
  width: 40px;
  text-align: center;
  line-height: 40px;
  border-radius: 3px;
  display: inline-block;
}

/* Progress with percentage */
.progress-w-percent {
  min-height: 20px;
  margin-bottom: 20px;
}

.progress-w-percent .progress {
  width: calc(100% - 50px);
  float: left;
  margin-top: 8px;
}

.progress-w-percent .progress-value {
  width: 40px;
  float: right;
  text-align: right;
  line-height: 20px;
}

/* Timeline widget */
.timeline-alt .timeline-item:before {
  background-color: hsl(var(--muted));
  content: "";
  left: 9px;
  position: absolute;
  top: 20px;
  bottom: 0;
  width: 2px;
}

.timeline-alt .timeline-icon {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  border: 2px solid transparent;
  font-size: 12px;
  text-align: center;
  line-height: 16px;
  background-color: white;
}

/* Inbox widget */
.inbox-widget .inbox-item {
  border-bottom: 1px solid hsl(var(--border));
  padding: 0.625rem 0;
}

.inbox-widget .inbox-item-img {
  width: 40px;
  margin-right: 15px;
}

/* Tilebox */
.tilebox-one i {
  position: absolute;
  right: 1.5rem;
  font-size: 2rem;
  opacity: 0.3;
}

/* CTA box */
.cta-box {
  background-image: url(../images/bg-pattern.png);
  background-size: cover;
}

.cta-box-title {
  font-size: 20px;
  line-height: 30px;
}

/* Multi-user avatars */
.multi-user a {
  margin-left: -15px;
  border: 3px solid hsl(var(--border));
  border-radius: 50px;
}

.multi-user a:first-child {
  margin-left: 0;
}
```

### Custom Switch

```css
/* Custom switch component */
input[data-switch] {
  display: none;
}

input[data-switch] + label {
  width: 56px;
  height: 24px;
  background-color: hsl(var(--muted));
  border-radius: 2rem;
  cursor: pointer;
  display: inline-block;
  position: relative;
  transition: all 0.1s ease-in-out;
}

/* Switch label text */
input[data-switch] + label:before {
  color: hsl(var(--foreground));
  content: attr(data-off-label);
  font-weight: 600;
  font-size: 0.75rem;
  line-height: 24px;
  position: absolute;
  right: 3px;
  top: 0;
  min-width: 1.66667rem;
  transition: all 0.1s ease-in-out;
}

/* Switch toggle */
input[data-switch] + label:after {
  content: "";
  position: absolute;
  left: 4px;
  background-color: hsl(var(--muted-foreground));
  border-radius: 2rem;
  height: 18px;
  width: 18px;
  top: 3px;
  transition: all 0.1s ease-in-out;
}

/* Checked state */
input[data-switch]:checked + label {
  background-color: hsl(var(--primary));
}

input[data-switch]:checked + label:before {
  color: white;
  content: attr(data-on-label);
  right: auto;
  left: 4px;
}

input[data-switch]:checked + label:after {
  left: 34px;
  background-color: hsl(var(--background));
}

/* Boolean switch (red/green) */
input[data-switch="bool"] + label {
  background-color: hsl(var(--destructive));
}

/* Disabled state */
input:disabled + label {
  opacity: 0.5;
  cursor: default;
}
```

### Ribbons

```css
/* Ribbon box */
.ribbon-box {
  position: relative;
}

.ribbon {
  position: relative;
  padding: 5px 12px;
  margin-bottom: 15px;
  box-shadow: 2px 5px 10px rgba(0, 0, 0, 0.15);
  color: white;
  font-size: 13px;
  font-weight: 600;
}

.ribbon:before {
  content: " ";
  border-style: solid;
  border-width: 10px;
  display: block;
  position: absolute;
  bottom: -10px;
  left: 0;
  margin-bottom: -10px;
  z-index: -1;
}

.ribbon.float-start {
  margin-left: -30px;
  border-radius: 0 3px 3px 0;
}

.ribbon.float-end {
  margin-right: -30px;
  border-radius: 3px 0 0 3px;
}

/* Ribbon two (corner ribbon) */
.ribbon-two {
  position: absolute;
  left: -5px;
  top: -5px;
  z-index: 1;
  overflow: hidden;
  width: 75px;
  height: 75px;
  text-align: right;
}

.ribbon-two span {
  font-size: 13px;
  color: white;
  text-align: center;
  line-height: 20px;
  transform: rotate(-45deg);
  width: 100px;
  display: block;
  box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.08);
  position: absolute;
  top: 19px;
  left: -21px;
  font-weight: 600;
}
```

### Social Icons

```css
/* Social list items */
.social-list-item {
  height: 2rem;
  width: 2rem;
  line-height: calc(2rem - 2px);
  display: block;
  border: 2px solid hsl(var(--muted-foreground));
  border-radius: 50%;
  color: hsl(var(--muted-foreground));
  text-align: center;
  transition: all 0.2s;
}

.social-list-item:hover {
  color: hsl(var(--foreground));
  border-color: hsl(var(--foreground));
}
```

### Steps Component

```css
/* Horizontal steps */
.horizontal-steps {
  display: flex;
  position: relative;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.horizontal-steps:before {
  content: "";
  display: block;
  position: absolute;
  width: 100%;
  height: 0.2em;
  background-color: hsl(var(--border));
}

.process-line {
  display: block;
  position: absolute;
  width: 50%;
  height: 0.2em;
  background-color: hsl(var(--primary));
}

.step-item {
  display: block;
  position: relative;
  height: 8px;
  width: 8px;
  margin: 0 2em;
  color: hsl(var(--primary));
  background-color: currentColor;
  border: 0.25em solid hsl(var(--background));
  border-radius: 50%;
  z-index: 5;
}

.step-item.current:before {
  content: "";
  display: block;
  position: absolute;
  top: 48%;
  left: 48%;
  padding: 1em;
  background-color: currentColor;
  border-radius: 50%;
  opacity: 0;
  z-index: -1;
  animation: animation-steps-current 2s infinite ease-out;
}

@keyframes animation-steps-current {
  from {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
}
```

## Authentication Pages

```css
/* Auth brand */
.auth-brand {
  margin-bottom: 2rem;
}

/* Authentication background */
body.authentication-bg .account-pages {
  align-items: center;
  display: flex;
  min-height: 100vh;
}

/* Auth fluid layout */
.auth-fluid {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 100vh;
  flex-direction: row;
  align-items: stretch;
  background: url("../images/bg-auth.jpg") center;
  background-size: cover;
}

.auth-fluid-form-box {
  max-width: 480px;
  border-radius: 0;
  z-index: 2;
  padding: 3rem;
  background-color: hsl(var(--card));
  position: relative;
  width: 100%;
}

.auth-fluid-right,
.auth-fluid-left {
  padding: 6rem 3rem;
  flex: 1;
  position: relative;
  color: white;
  background-color: rgba(0, 0, 0, 0.3);
}

/* Logout icon */
.logout-icon {
  width: 140px;
}
```

## Preloader

```css
/* Preloader overlay */
#preloader {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: hsl(var(--muted));
  z-index: 9999;
}

#status {
  width: 80px;
  height: 80px;
  position: absolute;
  left: 50%;
  top: 50%;
  margin: -40px 0 0 -40px;
}

/* Bouncing loader animation */
@keyframes bouncing-loader {
  to {
    opacity: 0.1;
    transform: translate3d(0, -16px, 0);
  }
}

.bouncing-loader {
  display: flex;
  justify-content: center;
}

.bouncing-loader > div {
  width: 13px;
  height: 13px;
  margin: 32px 3px;
  background: hsl(var(--primary));
  border-radius: 50%;
  animation: bouncing-loader 0.6s infinite alternate;
}

.bouncing-loader > div:nth-child(2) {
  animation-delay: 0.2s;
  background: hsl(var(--destructive));
}

.bouncing-loader > div:nth-child(3) {
  animation-delay: 0.4s;
  background: hsl(var(--success));
}
```

## Print Styles

```css
/* Print media query */
@media print {
  .leftside-menu,
  .end-bar,
  .page-title-box,
  .navbar-custom,
  .footer {
    display: none;
  }
  
  .card-body,
  .content-page,
  .end-bar,
  .content,
  body {
    padding: 0;
    margin: 0;
  }

  .card {
    box-shadow: none;
  }
}
```

## Utility Classes

### Text Utilities
```css
/* Font sizes */
.font-10 { font-size: 10px !important; }
.font-11 { font-size: 11px !important; }
.font-12 { font-size: 12px !important; }
.font-13 { font-size: 13px !important; }
.font-14 { font-size: 14px !important; }
.font-15 { font-size: 15px !important; }
.font-16 { font-size: 16px !important; }
.font-18 { font-size: 18px !important; }
.font-20 { font-size: 20px !important; }
.font-22 { font-size: 22px !important; }
.font-24 { font-size: 24px !important; }
```

### Helper Classes
```css
/* Chart helpers */
.chart-content-bg {
  background-color: hsl(var(--muted));
}

.chart-content-border {
  border: 1px solid hsl(var(--border));
}

/* Card background image */
.card-bg-img {
  background-size: cover;
  background-position: right center;
  background-repeat: no-repeat;
}

/* Background lighten utilities */
.bg-primary-lighten {
  background-color: hsl(var(--primary) / 0.1) !important;
}

.bg-secondary-lighten {
  background-color: hsl(var(--secondary)) !important;
}

.bg-success-lighten {
  background-color: hsl(var(--success) / 0.1) !important;
}

.bg-info-lighten {
  background-color: hsl(var(--info) / 0.1) !important;
}

.bg-warning-lighten {
  background-color: hsl(var(--warning) / 0.1) !important;
}

.bg-danger-lighten {
  background-color: hsl(var(--destructive) / 0.1) !important;
}
```

## Code Documentation

```css
/* Syntax highlighting (hljs) */
.hljs {
  display: block;
  padding: 0 1em;
  color: hsl(var(--foreground));
  max-height: 420px;
  margin: -10px 0 -30px;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-subst {
  color: hsl(var(--foreground));
  font-weight: bold;
}

.hljs-string,
.hljs-doctag {
  color: hsl(var(--destructive));
}

.hljs-tag,
.hljs-name,
.hljs-attribute {
  color: hsl(var(--primary));
  font-weight: normal;
}

/* Code block with copy button */
.tab-pane.code {
  border: 1px solid hsl(var(--border));
  border-radius: 0.25rem;
  position: relative;
}

.btn-copy-clipboard {
  position: absolute;
  right: 8px;
  top: 10px;
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--success));
  color: hsl(var(--success));
  padding: 0.28rem 0.8rem;
  font-size: 0.875rem;
  border-radius: 0.15rem;
  font-weight: 400;
  line-height: 1.5;
  transition: all .15s ease-in-out;
}

.btn-copy-clipboard:hover,
.btn-copy-clipboard:focus,
.btn-copy-clipboard:active {
  background-color: hsl(var(--success));
  color: white;
}

/* Custom scrollbar for code blocks */
pre::-webkit-scrollbar {
  -webkit-appearance: none;
}

pre::-webkit-scrollbar:vertical {
  width: 5px;
  margin-right: 5px;
}

pre::-webkit-scrollbar:horizontal {
  height: 5px;
}

pre::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  margin-right: 5px;
  border: none;
}

pre::-webkit-scrollbar-track {
  border-radius: 10px;
  background-color: transparent;
}
```

## Custom Form Elements

```css
/* Colored checkboxes and radios */
.form-checkbox-primary .form-check-input:checked,
.form-radio-primary .form-check-input:checked {
  background-color: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.form-checkbox-success .form-check-input:checked,
.form-radio-success .form-check-input:checked {
  background-color: hsl(var(--success));
  border-color: hsl(var(--success));
}

/* Card radio */
.card-radio {
  padding: 0;
}

.card-radio .form-check-label {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 0.25rem;
  padding: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  position: relative;
  padding-right: 32px;
  cursor: pointer;
}

.card-radio .form-check-input {
  display: none;
}

.card-radio .form-check-input:checked + .form-check-label:before {
  content: "\f05e0";
  font-family: "Material Design Icons";
  position: absolute;
  bottom: 2px;
  right: 6px;
  font-size: 16px;
  color: hsl(var(--primary));
}
```

## Base Styles

```css
/* HTML and body */
html {
  position: relative;
  min-height: 100%;
}

body {
  overflow-x: hidden;
}

/* Headings */
h1, h2, h3, h4, h5, h6,
.h1, .h2, .h3, .h4, .h5, .h6 {
  margin-top: 0.5rem;
}

/* Links and buttons */
button,
a {
  outline: none !important;
}

/* Labels */
label {
  font-weight: 600;
}

/* Address */
address.address-lg {
  line-height: 24px;
}

/* Bold text */
b,
strong {
  font-weight: 700;
}

/* iOS cursor fix */
@supports (-webkit-overflow-scrolling: touch) {
  body {
    cursor: pointer;
  }
}
```

## Theme Root Variables

```css
/* Light theme (default) */
:root,
[data-bs-theme="light"] {
  --input-bg: #ffffff;
  --border-color-custom: #f7f7f7;
}

/* Dark theme */
[data-bs-theme="dark"] {
  --light: #464f5b;
  --light-rgb: 70, 79, 91;
  --dark: #f1f1f1;
  --dark-rgb: 241, 241, 241;
  --secondary: #6c757d;
  --secondary-rgb: 108, 117, 125;
  --box-shadow: 0px 0px 35px 0px rgba(49, 57, 66, 0.5);
  --input-bg: #404954;
  --border-color-custom: #404954;
}
```

## Hero Section

```css
/* Hero section with gradient */
.hero-section {
  position: relative;
  padding: 80px 0 120px 0;
}

.hero-section:after {
  content: " ";
  background-image: linear-gradient(to bottom, #6379c3, #546ee5);
  position: absolute;
  top: -400px;
  right: 0;
  bottom: 0;
  z-index: -1;
  width: 100%;
  border-radius: 0;
  transform: skewY(-3deg);
}
```

## Email Layout

```css
/* Email page layout */
.page-aside-left {
  width: 240px;
  float: left;
  padding: 0 20px 20px 10px;
  position: relative;
}

.page-aside-left:before {
  content: "";
  background-color: hsl(var(--background));
  width: 5px;
  position: absolute;
  right: -15px;
  height: 100%;
  bottom: -1.5rem;
}

.page-aside-right {
  margin: -1.5rem 0 -1.5rem 250px;
  border-left: 5px solid hsl(var(--background));
  padding: 1.5rem 0 1.5rem 25px;
}

/* Email list */
.email-list > li {
  position: relative;
  display: block;
  height: 51px;
  line-height: 50px;
  cursor: default;
  transition-duration: 0.3s;
}

.email-list > li:hover,
.email-list > li.active,
.email-list > li.mail-selected {
  background: hsl(var(--muted));
  transition-duration: 0.05s;
}

.email-list > li.unread a {
  font-weight: 600;
  color: hsl(var(--foreground));
}

/* Email action icons */
.email-action-icons {
  opacity: 0;
  transition: all 0.5s;
}

.email-list > li:hover .email-action-icons {
  opacity: 1;
}

/* Email menu */
.email-menu-list a {
  color: hsl(var(--muted-foreground));
  padding: 12px 5px;
  display: block;
  font-size: 15px;
}

.email-menu-list a:hover {
  color: hsl(var(--foreground));
}
```

---

Last Updated: 2025-07-25