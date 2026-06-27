# Keel Design System

## 1. Atmosphere & Identity

Keel feels like a dark instrument panel for a small, serious proof primitive. The page
should feel inspectable before it feels persuasive: crisp text, compact evidence, and
visible state transitions. The signature is the receipt rail, where every broad claim is
paired with a command, file, or observed result.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| Surface/canvas | `--color-canvas` | `#f7f9fb` | `#0b1118` | Page background |
| Surface/layer | `--color-layer` | `#ffffff` | `#111a24` | Header, panels |
| Surface/layer-2 | `--color-layer-2` | `#edf2f7` | `#182431` | Code, receipt blocks |
| Surface/raised | `--color-raised` | `#ffffff` | `#1d2b39` | Emphasis panels |
| Text/primary | `--color-text` | `#111827` | `#f7f9fb` | Body and headings |
| Text/muted | `--color-muted` | `#536171` | `#9baaba` | Secondary copy |
| Text/faint | `--color-faint` | `#768596` | `#6f7f8f` | Metadata |
| Border/default | `--color-border` | `rgba(58, 74, 92, 0.18)` | `rgba(174, 196, 216, 0.14)` | Panels, rules |
| Border/strong | `--color-border-strong` | `rgba(58, 74, 92, 0.32)` | `rgba(174, 196, 216, 0.28)` | Active states |
| Accent/orange | `--color-orange` | `#c45c16` | `#f6821f` | Primary signal |
| Accent/amber | `--color-amber` | `#a97112` | `#f7b53b` | Warnings, proof highlights |
| Accent/blue | `--color-blue` | `#286b86` | `#71b8d8` | Links, expansion |
| Status/success | `--color-green` | `#247a57` | `#63d5a2` | Accepted state |
| Status/error | `--color-red` | `#b04434` | `#ff7d68` | Refused state |

### Rules

- Dark is the default. Light tokens exist for system color-scheme compatibility.
- Orange marks the control point. Blue marks inspection or source links.
- Green and red appear only for observed state, never decoration.
- New colors require a semantic role and an update to this table.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
| --- | --- | --- | --- | --- | --- |
| Display | `clamp(2.75rem, 8vw, 6.75rem)` | 780 | 0.92 | 0 | Hero statement |
| H1 | `clamp(2.25rem, 5vw, 4.5rem)` | 760 | 1 | 0 | Page title |
| H2 | `clamp(1.75rem, 3vw, 2.5rem)` | 720 | 1.1 | 0 | Major sections |
| H3 | `1.125rem` | 680 | 1.35 | 0 | Panel titles |
| Body/lg | `1.125rem` | 440 | 1.65 | 0 | Lead paragraphs |
| Body | `1rem` | 420 | 1.65 | 0 | Default text |
| Body/sm | `0.875rem` | 430 | 1.55 | 0 | Secondary copy |
| Caption | `0.75rem` | 640 | 1.35 | `0.08em` | Labels, metadata |
| Code | `0.875rem` | 500 | 1.6 | 0 | Commands and receipts |

### Font Stack

- Primary: `Inter`, `ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`
- Mono: `IBM Plex Mono`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, `monospace`

### Rules

- Heading text can be large only in the hero and section openers.
- Dense panels use smaller headings and generous line height.
- Mono is for machine state, commands, labels, and evidence.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of 4px.

| Token | Value | Usage |
| --- | --- | --- |
| `--space-1` | `4px` | Tight inline gaps |
| `--space-2` | `8px` | Labels, small groups |
| `--space-3` | `12px` | Compact panel gaps |
| `--space-4` | `16px` | Default inner rhythm |
| `--space-5` | `20px` | Text block spacing |
| `--space-6` | `24px` | Panel padding |
| `--space-8` | `32px` | Grid gaps |
| `--space-10` | `40px` | Section groups |
| `--space-12` | `48px` | Major content breaks |
| `--space-16` | `64px` | Section padding |
| `--space-20` | `80px` | Hero padding |
| `--space-24` | `96px` | Maximum vertical break |

### Grid

- Max content width: `1180px`
- Column system: responsive CSS grid, 12 columns on desktop, single column on mobile.
- Breakpoints: `640px`, `768px`, `1024px`, `1280px`.

### Rules

- Page sections are full-width bands with constrained inner content.
- Cards are for repeated evidence units only. Do not nest cards.
- Fixed-format blocks such as terminal output and status rows need stable dimensions.

## 5. Components

### Evidence Panel

- **Structure**: heading, one-sentence claim, command or file reference, observed result.
- **Variants**: `accepted`, `refused`, `neutral`.
- **Spacing**: `--space-6` padding, `--space-3` internal gap.
- **States**: hover border uses `--color-border-strong`; focus outlines use `--color-orange`.
- **Accessibility**: meaningful heading, link target if a source file exists.
- **Motion**: border and transform only, 150ms.

### Command Rail

- **Structure**: ordered list of commands with short result notes.
- **Variants**: quick start, proof run.
- **Spacing**: `--space-4` between rows.
- **States**: code links use blue hover; no copy buttons for 0.0.1.
- **Accessibility**: commands remain selectable text.
- **Motion**: none.

### Status Strip

- **Structure**: compact label/value pairs.
- **Variants**: proven, unproven, open.
- **Spacing**: `--space-3` inline gap, wraps on mobile.
- **States**: semantic color dot only.
- **Accessibility**: color is paired with text.
- **Motion**: none.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | 120ms | ease-out | Link and button feedback |
| Standard | 180ms | ease-out | Panel hover |
| Emphasis | 420ms | cubic-bezier(0.16, 1, 0.3, 1) | Initial section reveal |

### Rules

- Animate only `transform`, `opacity`, and border color.
- Respect `prefers-reduced-motion`.
- No scroll listener animation in 0.0.1.

## 7. Depth & Surface

### Strategy

Tonal shift with thin borders. No heavy shadows.

| Level | Treatment | Usage |
| --- | --- | --- |
| Canvas | `--color-canvas` with subtle grid | Page base |
| Layer | `--color-layer` and border | Main panels |
| Layer 2 | `--color-layer-2` | Code, terminal, receipt detail |
| Raised | `--color-raised` and stronger border | Hero proof artifact |

Depth comes from controlled contrast, not decoration.
