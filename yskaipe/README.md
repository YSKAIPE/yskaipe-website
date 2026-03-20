# YSKAIPE — Every Maze Has an Exit

> *pronounced "escape"*

AI-powered navigation through the mazes of Bitcoin, Sustainability, the Garden, and AI. The maze is a puzzle, not a prison.

## The Model

YSKAIPE is built around one idea: **every complex domain is a maze, and AI is your map.**

Each "maze" is a branch of the site with its own identity, color, premise quote, paths, and exit:

| Maze | Color | Exit |
|------|-------|------|
| **YSKAIPE Bitcoin** | `#f7931a` | Generational digital wealth |
| **YSKAIPE Sustainability** | `#3d6b2a` | Soil sovereignty + cash-flowing land |
| **YSKAIPE the Garden** | `#a03060` | Year-round abundance from your own land |
| **YSKAIPE AI** | `#1a3a8f` | Empire without employees |

## Stack

- **Next.js 14** — App Router, React Server Components
- **TypeScript** — strict mode
- **Tailwind CSS v3** — utility classes + custom design tokens
- **Google Fonts** — Bebas Neue (display) + Lora (body) + JetBrains Mono (UI/code)

## Structure

```
app/
  layout.tsx        # Root layout with metadata + font imports
  page.tsx          # Homepage: Nav → Hero → Ticker → MazeGrid → Manifesto → PromptBar → Footer
  globals.css       # Base styles, animations, font variables
  bitcoin/page.tsx  # YSKAIPE Bitcoin maze detail page
  sustain/page.tsx  # YSKAIPE Sustainability maze detail page
  garden/page.tsx   # YSKAIPE the Garden maze detail page
  ai/page.tsx       # YSKAIPE AI maze detail page

components/
  Nav.tsx           # Sticky nav with maze pills + mobile menu
  Hero.tsx          # Hero with headline + maze SVG illustration
  Ticker.tsx        # Scrolling ticker: MAZE → path → EXIT
  MazeGrid.tsx      # Four maze cards with hover states
  Manifesto.tsx     # Dark band: "The maze is a puzzle, not a prison"
  PromptBar.tsx     # "Which maze are you in?" interactive prompt section
  MazePage.tsx      # Shared layout for all four maze detail pages
  Footer.tsx        # Links, maze dots, copyright
```

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Design System

### Typography
- **Display**: Bebas Neue — headings, CTAs, maze titles
- **Body**: Lora (italic) — prose, premises, body copy
- **UI/Mono**: JetBrains Mono — tags, labels, code, navigation

### Colors
```css
--ink:     #0d0d0d   /* primary text, borders */
--paper:   #f4f0e4   /* page background */
--aged:    #e8e0c8   /* section backgrounds */
--fog:     #8a8070   /* muted text */
--finance: #f7931a   /* Bitcoin maze */
--sustain: #3d6b2a   /* Sustainability maze */
--garden:  #a03060   /* Garden maze */
--ai:      #1a3a8f   /* AI maze */
--exit:    #00c853   /* exit green — the path color */
```

### Philosophy
> *Every wall that looks like a dead end is just a turn you haven't mapped yet.*

## Deploy

```bash
pnpm build
```

Deploy to Vercel with zero config — the repo is already structured for Vercel's Next.js integration.

## Adding a New Maze

1. Add a new entry to `mazes` array in `components/MazeGrid.tsx`
2. Create `app/[maze-name]/page.tsx` using the `MazePage` component
3. Add a nav pill in `components/Nav.tsx`
4. Add to the ticker in `components/Ticker.tsx`
5. Add to the footer links in `components/Footer.tsx`

---

*The maze is a puzzle, not a prison. YSKAIPE.com*
