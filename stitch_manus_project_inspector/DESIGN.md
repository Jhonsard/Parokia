---
name: Parokia Editorial & Liturgy
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3f4850'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#785a00'
  on-secondary: '#ffffff'
  secondary-container: '#fdc425'
  on-secondary-container: '#6d5200'
  tertiary: '#894d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#ac6200'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#ffdf9a'
  secondary-fixed-dim: '#f7be1d'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#5a4300'
  tertiary-fixed: '#ffdcc0'
  tertiary-fixed-dim: '#ffb875'
  on-tertiary-fixed: '#2d1600'
  on-tertiary-fixed-variant: '#6b3b00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-hero:
    fontFamily: Chivo
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 52px
  display-hero-mobile:
    fontFamily: Chivo
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 36px
  headline-lg:
    fontFamily: Chivo
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 42px
  headline-lg-mobile:
    fontFamily: Chivo
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  headline-md:
    fontFamily: Chivo
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  headline-sm:
    fontFamily: Chivo
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  kicker:
    fontFamily: Chivo
    fontSize: 12px
    fontWeight: '800'
    lineHeight: 16px
  body-lead:
    fontFamily: Source Serif 4
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 30px
  body-md:
    fontFamily: Source Serif 4
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-sm:
    fontFamily: Source Serif 4
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-ticker:
    fontFamily: Chivo
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
  label-data:
    fontFamily: Chivo
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  caption:
    fontFamily: Chivo
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 15px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a high-credibility editorial and liturgical publishing architecture tailored for the vibrant parish community of Notre-Dame d'Afrique in Goma. Drawing direct inspiration from the rigor, typographical discipline, and clear information hierarchy of international broadcast journalism platforms like Radio France Internationale (RFI), this interface treats community bulletins, liturgical schedules, and pastoral communiqués with journalistic authority and dignity.

The design movement is **Contemporary Editorial Broadsheet with Liturgical Adaptability**:
- **Editorial Directness**: High-density layouts, crisp horizontal rules, disciplined vertical rhythm, and unmistakable headline hierarchy that allows readers to scan regional news, chapel dispatches, and parish updates without visual ambiguity.
- **Ecclesiastical Dignity**: While built like a premier digital newsroom, the platform incorporates liturgical reverence through calibrated typographic pairing and an accent architecture tuned to the liturgical calendar of the Catholic Church.
- **Communal Breadth**: The tone balances authoritative announcements from the parish curacy with grassroots vitality from the 8 chapels (Communautés Ecclésiales Vivantes) across Goma.

## Colors

The core color strategy enforces pristine contrast, pairing neutral backgrounds with ink-like typography. Brand presence and contextual meaning are driven by a dynamic liturgical theming engine.

### Neutral Foundation
- **Canvas Base**: `#FFFFFF` (Pristine broadsheet paper) and `#F8FAFC` (Slate Tint 50, reserved for section wells, reading sidebars, and grid row differentiation).
- **Ink Primary**: `#0F172A` (Slate 900) provides stark, uncompromised contrast for primary headlines and heavy broadsheet display text.
- **Ink Body**: `#1E293B` (Slate 800) for sustained reading comfort across extended homilies and pastoral letters.
- **Ink Muted / Structural Rules**: `#64748B` (Slate 500) for metadata, chapel datelines, and bylines; `#CBD5E1` (Slate 300) and `#E2E8F0` (Slate 200) for hairline dividers.

### Liturgical Token Dynamic Engine
The primary accents are bound to CSS custom properties (`--accent-color`, `--accent-hover`, `--accent-subtle`) which map dynamically to the liturgical calendar, defaulting to the Marian Sky Blue of Notre-Dame d'Afrique:
- **Marian Ordinary / Default (Marian Sky Blue)**:
  - `--accent-color`: `#0284C7` (Sky 600)
  - `--accent-hover`: `#0369A1` (Sky 700)
  - `--accent-subtle`: `#E0F2FE` (Sky 100)
- **Sacred Gold (Solemnities & Feasts)**:
  - Base: `#EAB308` (Yellow 500) | Accent: `#FACC15` (Yellow 400) | Deep: `#A16207` (Yellow 700)
  - Applied as persistent secondary accents for liturgical badges, feast-day callouts, and ceremonial highlights.
- **Liturgical Variable Modes (Runtime Swappable)**:
  - *Temps Ordinaire (Green)*: `--accent-color`: `#15803D`; `--accent-subtle`: `#DCFCE7`
  - *Avent & Carême (Violet)*: `--accent-color`: `#7E22CE`; `--accent-subtle`: `#F3E8FF`
  - *Martyrs & Pentecôte (Rouge)*: `--accent-color`: `#B91C1C`; `--accent-subtle`: `#FEE2E2`
  - *Temps Pascal & Noël (Blanc/Or)*: `--accent-color`: `#D97706`; `--accent-subtle`: `#FEF3C7`

## Typography

The typography embodies newsroom clarity merged with pastoral gravitas through a pairing of **Chivo** (display, navigation, data tables, and headlines) and **Source Serif 4** (longform reading and devotional liturgy text).

- **Chivo (Grotesque / Headline & Data)**: Delivers punchy, urgent editorial weight inspired by French broadcast journalism. It handles all breaking tags, chapel navigational tickers, datelines, mass tables, and kicker labels. Kickers and badges are set in tight, uppercase letter spacing (+0.05em to +0.08em) to anchor narrative priority.
- **Source Serif 4 (Humanist Serif / Editorial Body)**: Delivers high legibility and dignified warmth for liturgical readings, homilies, pastoral messages, and long-form articles. Its generous x-height and clear punctuation guarantee fatigue-free reading across both desktop and mobile devices.

## Layout & Spacing

The layout is built upon a **12-column journalistic modular grid** on desktop and tablet, shifting to a **4-column structured linear feed** on mobile. 

- **Desktop (>= 1024px)**: 12-column layout with 24px (`1.5rem`) gutters and an outer container capped at 1280px. Columns are grouped strictly along broadcast news ratios: 8-column primary editorial well paired with a 4-column liturgical agenda/chapel register sidebar, or equal tri-part 4-4-4 splits for chapel dispatch roundups.
- **Tablet (768px - 1023px)**: 8-column layout with 16px gutters, dropping sidebars below lead news modules while maintaining horizontal ticker integrity.
- **Mobile (< 768px)**: 4-column layout with 12px (`0.75rem`) gutters and 16px (`1rem`) lateral page margins. Complex grids (such as the mass schedule) reflow into scrollable tabular cards with frozen headers.

### Vertical Rhythm & Hairline Separation
Elements do not float arbitrarily; they are anchored using an 8px baseline cadence. Columns are demarcated by solid 1px borders (`#E2E8F0`), creating dense, organized content density true to classical broadsheets.

## Elevation & Depth

To remain faithful to authoritative print journalism, this design system avoids simulated skeuomorphic depths, high-blur dropshadows, or heavy float effects. Hierarchy is achieved through **structural planar contrast and hairline boundaries**:

- **Layer 0 (Canvas)**: Crisp `#FFFFFF` for primary stories; tinted `#F8FAFC` for secondary schedule containers and contextual side panels.
- **Borders & Dividers**: Physical boundaries are defined through 1px crisp borders (`#E2E8F0` and `#CBD5E1`). Breaking news or highlighted sections use an intentional 2px to 4px solid left/top border keyed directly to `--accent-color`.
- **Card States**: Cards sit flush against the grid. On hover or active states, surfaces do not lift into physical space; instead, titles switch immediately to `--accent-color`, accompanied by an ultra-subtle border color shift to `#94A3B8`.
- **Liturgical Overlays & Modals**: Modals and fast-switcher drawers employ clean `#FFFFFF` backdrops with a 1px border (`#0F172A`/10%) and an ambient boundary shadow: `0 8px 30px rgba(15, 23, 42, 0.08)`.

## Shapes

The roundedness level is strictly **0 (Sharp)** across all editorial and administrative modules:
- Image containers, article cards, breaking news tickers, chapel tabs, and liturgical tables are executed with **0px border radius**. This sharp geometry anchors the broadsheet newspaper aesthetic, maximizing content density and pixel-perfect column alignment.
- Minimal exceptions: Status pips (e.g., live streaming indicator) are circular (9999px), and the liturgical season pill switcher utilizes deliberate pill silhouettes only when functioning as floating meta-toggles to contrast clearly against the grid.

## Components

### 1. RFI-Style Chapel Horizontal Ticker (Barre des Communautés)
- **Structure**: A fixed-height (44px) full-bleed horizontal bar directly underneath the masthead.
- **Style**: Dark slate surface (`#0F172A`) with light gray hairline bottom border.
- **Chapel Items**: The 8 chapels—**TUNGANE, USHINDI, AMANI, MAPENDO, AMKENI, UMOJA, TUNDA, MWANGAZA**—are laid out horizontally in uppercase `label-ticker` Chivo typography.
- **Interaction**: Items are separated by a subtle bullet or hairline slash (`#334155`). On hover/active, the chapel text highlights with `--accent-color`, revealing a 2px bottom active underline bar. Supports mouse-drag and native inertial horizontal scroll on mobile viewports.

### 2. Liturgical Season Banner & Quick Switcher
- **Structure**: A persistent editorial status bar that identifies the liturgical time (e.g., *Temps Ordinaire - Semaine XXVIII* or *Fête de Notre-Dame d'Afrique*).
- **Visuals**: Background in `--accent-subtle`, with a left-accent 4px solid stripe in `--accent-color` and liturgical text in `--accent-hover`. Includes the day's liturgical color swatch indicator and liturgical verse snippet.
- **Quick Switcher**: A segmented control allowing the sacristy/parish secretary to toggle liturgical seasons or allow users to preview liturgical dates.

### 3. Editorial Breaking News & Spotlight Hero
- **Grid Setup**: An asymmetrical 8 + 4 column layout.
- **Hero (Column 8)**: Contains a heavy editorial picture ratio (16:9), an uppercase kicker in `--accent-color` (e.g., *VIE PAROISSIALE* or *COMMUNIQUÉ DU CURÉ*), a `display-hero` headline in Chivo 800, and a concise `body-lead` deck in Source Serif 4.
- **Spotlight List (Column 4)**: Vertical stack of 3 prioritized articles separated by 1px horizontal borders. Each item features an urgent timestamp, chapel origin tag, and a 3-line bold summary.
- **Breaking News Flash**: When active, a high-urgency crimson red bar (`#DC2626`) spans the grid top with bold white uppercase typography, preceded by a pulsed "URGENT" badge.

### 4. Dynamic Choir Mass Schedule Grid (Programme des Messes)
- **Structure**: A structured timetable card organized by day and mass slot (e.g., *Messe de 06h30, 08h30, 10h30, 17h00*).
- **Columns**: Mass time, Language (Kiswahili / Français), Location (Sanctuaire Central or Chapel name), and Assigned Choir.
- **Choir Assignment Badges**: The choir names (e.g., *Chœur Sainte Cécile*, *Chœur Saint Joseph*) appear within compact, high-contrast bordered tags with a small sacred gold secondary dot indicator.
- **Responsive Behavior**: Transitions from a structured tabular matrix on desktop to chronological stacked cards on mobile with distinct time badges.

### 5. Choir Leader Membership Module (Espace Dirigeants & Chorales)
- **Structure**: Dedicated gated administrative and management block designed in a clean utility dashboard aesthetic.
- **Components Included**:
  - **Repertoire Index**: Tabular list of liturgical hymns mapped to Sunday readings, with downloadable chant sheets (PDF/Audio links).
  - **Attendance & Duty Roster**: Checkbox lists and member directory with status badges (*Présent*, *En Répétition*, *Officiant ce Dimanche*).
  - **Inputs & Filters**: Sharp, flat input fields featuring a 1px slate border (`#CBD5E1`), focusing to a 2px outline in `--accent-color`.

### 6. Standard UI Controls
- **Buttons**:
  - *Primary*: Background `--accent-color`, sharp edges (0px radius), text white, uppercase Chivo `label-ticker`, hover state darkened to `--accent-hover`.
  - *Secondary / Broadsheet Outline*: 1px solid `#0F172A`, transparent background, text `#0F172A`, hover background fills with `#0F172A` and text white.
- **Chips & Tags**: Zero-radius badges, 1px solid border, font `kicker` (Chivo 11px uppercase), padded 2px top/bottom and 8px left/right.
- **Cards**: Flat white canvas, 1px solid `#E2E8F0`, zero shadow. Hover state shifts only the header typography to `--accent-color`.