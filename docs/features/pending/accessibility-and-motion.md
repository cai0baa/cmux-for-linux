# Accessibility & Motion

## ARIA Roles & Screen Reader Support

Proper semantic markup for assistive technology navigation.

| Detail | Description |
|--------|-------------|
| cmux | macOS accessibility APIs for VoiceOver, role annotations on all interactive elements |
| Needs | `role`, `aria-label`, `aria-live` attributes on panes, tabs, buttons |
| Components | `TabBar`, `PaneTabBar`, `TerminalPane`, `CommandPalette` need ARIA |
| Priority | **Medium** |

## High Contrast Mode

Accessibility theme with increased contrast ratios meeting WCAG AAA.

| Detail | Description |
|--------|-------------|
| cmux | High contrast color scheme option in settings |
| Needs | New theme in `themeDefinitions.ts` with AAA contrast ratios |
| Needs | `prefers-contrast: more` media query detection |
| Priority | **Medium** |

## Reduced Motion

Respect `prefers-reduced-motion` for users sensitive to animations.

| Detail | Description |
|--------|-------------|
| cmux | Disables all transitions and animations when system preference set |
| Needs | CSS `@media (prefers-reduced-motion: reduce)` blocks |
| Needs | Disable tab flash, hover transitions, sidebar animations |
| Current | No reduced-motion support in `global.css` |
| Priority | **High** |

### Implementation

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Internationalization (i18n)

Multi-language support for UI strings.

| Detail | Description |
|--------|-------------|
| cmux | English only, but structured for localization with string constants |
| Needs | `i18next` or similar, string extraction from components |
| Needs | Language selector in settings, RTL layout support |
| Scope | ~50 UI strings (tab labels, button text, menu items, tooltips) |
| Priority | **Low** |

## Keyboard Navigation

Full keyboard accessibility for all UI elements without mouse.

| Detail | Description |
|--------|-------------|
| cmux | Tab-order management, focus rings, keyboard-only navigation mode |
| Needs | `tabIndex` management, visible focus indicators, skip-to-content |
| Needs | Arrow key navigation in `TabBar` and `PaneTabBar` |
| Priority | **Medium** |
