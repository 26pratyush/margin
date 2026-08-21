# Margin design system

Margin uses a dark, quiet interface that keeps the user's financial information in focus. The visual system is intentionally small: graphite surfaces, warm readable text, one lichen accent, and a restrained teal-blue note for orientation and secondary emphasis.

## Design language

- **Clear before clever:** labels and hierarchy should explain the next useful action without relying on decorative patterns.
- **Calm density:** use compact rows and purposeful spacing; do not turn every value into a card.
- **One primary accent:** lichen green marks active navigation, primary actions, and meaningful progress.
- **Teal as a quiet signal:** teal-blue appears in small navigation or orientation details, selected secondary icons, and local/private status cues. It must not become a second primary brand color.
- **No AI-dashboard styling:** no neon gradients, glass panels, rainbow metrics, decorative charts, or oversized empty containers.
- **Semantic color has meaning:** positive, negative, and warning colors communicate state; they are not decoration.

## Color tokens

| Token                    | Hex       | Intended use                                      |
| ------------------------ | --------- | ------------------------------------------------- |
| `--color-canvas`         | `#111413` | Page background                                   |
| `--color-surface`        | `#191D1B` | Sidebar, panels, sections                         |
| `--color-surface-raised` | `#222824` | Hero surfaces, selected rows, menus               |
| `--color-surface-hover`  | `#29302B` | Hover and pressed surface                         |
| `--color-border`         | `#323A35` | Quiet dividers and panel borders                  |
| `--color-border-strong`  | `#465149` | Focused controls and stronger separators          |
| `--color-text`           | `#F3F0E8` | Headings and primary values                       |
| `--color-text-secondary` | `#B2B7AF` | Supporting labels and body text                   |
| `--color-text-muted`     | `#858D84` | Metadata, captions, and placeholders              |
| `--color-accent`         | `#C9E788` | Primary action, active navigation, selected state |
| `--color-accent-strong`  | `#AFCF69` | Accent bars and chart emphasis                    |
| `--color-teal`           | `#81C9D0` | Restrained secondary signal and orientation cue   |
| `--color-teal-deep`      | `#3C818A` | Teal fills and small chart bars                   |
| `--color-positive`       | `#A8D6B0` | Income, success, healthy connection               |
| `--color-negative`       | `#F0A39B` | Expenses, errors, destructive actions             |
| `--color-warning`        | `#E6BE78` | Attention and incomplete setup                    |

The complete palette is recorded here even when a first surface only needs a subset. Future screens should consume these semantic tokens rather than introducing new one-off hex values.

## Usage rules

- Use `--color-accent` on a dark foreground only when the control is the primary action or active state. Use dark text on accent-filled controls.
- Use teal-blue for small, meaningful moments: local-only indicators, secondary icon emphasis, links, and focused insight details. Avoid teal buttons beside lichen buttons.
- Keep financial amounts neutral by default. Use positive and negative colors only when the sign or state is useful information.
- Prefer borders and value shifts over shadows to separate surfaces.
- Keep corners modest: 8px for controls, 12px for compact surfaces, and 18px for major panels.
- Keep the type scale small and intentional: one page title, one section title, and compact metadata rather than many competing headings.

## Accessibility

Primary, secondary, and muted text are chosen to maintain strong contrast against the canvas. Interactive states must remain distinguishable without color alone, and semantic states should include text or icon support. Validate any new color pairing against WCAG AA before shipping.

## Current coverage

Issue #6 applies the tokens to the application shell, Overview, Transactions, Insights, Commitments, Settings, navigation, empty states, backup controls, and local-storage status. The chart colors, warning token, and some deeper surface states are reserved for later product slices.
