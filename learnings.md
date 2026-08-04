# 📚 LUMA Project - Complete Architecture & Tech Stack Guide

> **Note:** This `learnings.md` file is ignored by Git (`.gitignore`) so you can update it freely as a personal learning log throughout the development of **LUMA**.

---

## 1. 🏗️ Tech Stack Overview

LUMA is a modern fullstack web application and high-performance HTML5 canvas game built using modern TypeScript web technologies.

```
┌─────────────────────────────────────────────────────────────────┐
│                      LUMA FRONTEND / CLIENT                     │
│  React 19 + TypeScript + Tailwind CSS v4 + HTML5 Canvas (120FPS)│
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TANSTACK START (SSR & ROUTER)                 │
│ Fullstack Framework built on Nitro Server Engine + File Routes  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SUPABASE BACKEND & DATABASE                   │
│    PostgreSQL Database + Auth + Row Level Security (RLS)        │
└─────────────────────────────────────────────────────────────────┘
```

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | **React 19 + TypeScript** | Component-based UI logic and strong type safety |
| **Game Engine** | **HTML5 Canvas 2D API** | Custom 120 FPS game loop, particle engine, and render loop |
| **Fullstack Framework**| **TanStack Start** | Fullstack SSR (Server-Side Rendering) framework & file-based routing |
| **Styling** | **Tailwind CSS v4 + Radix UI**| Utility-first styling & accessible unstyled UI primitives |
| **Database & Auth** | **Supabase (PostgreSQL)** | Managed relational database, Auth, and real-time backend |
| **Build Tool** | **Vite v8** | Ultra-fast local development server and production bundler |

---

## 2. ⚡ How Lovable Works & Deployment Architecture

### How Lovable Created & Deployed the ready-made link (`.lovable.app`)
1. **AI Generation**: Lovable takes natural language prompts and generates clean, modular TypeScript, React, and Tailwind CSS code.
2. **Cloud Hosting**: Lovable spins up a serverless deployment environment (powered by Cloudflare Workers / Nitro) to host your live application.
3. **GitHub Sync Engine**:
   - When you link your GitHub repo (`TushalLohar/LUMA`) to Lovable via **GitHub Connect**, Lovable sets up a webhook.
   - Every time you push a commit (`git push origin main`), GitHub notifies Lovable.
   - Lovable automatically pulls your latest code, runs `npm run build`, and updates your live `.lovable.app` domain.

### How Lovable handles Supabase Keys
- In `.env`, you will find environment variables:
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
  ```
- **Why are public keys safe in frontend code?**
  Unlike traditional databases where database passwords must be hidden on a backend server, Supabase uses **Row Level Security (RLS)** directly inside PostgreSQL.
  Even if someone sees your public key, they can only perform database actions explicitly allowed by your PostgreSQL security rules!

---

## 3. 📦 Package Managers & Tooling (npm vs Bun vs Yarn)

- **Node.js**: The desktop JavaScript runtime that executes code outside the browser.
- **npm (Node Package Manager)**: The official standard package manager for Node.js.
  - `package.json`: Contains human-readable project details, scripts, and dependency version rules.
  - `package-lock.json`: Auto-generated lockfile recording the exact tree of installed sub-dependencies to ensure identical builds across all machines.
- **Bun**: A newer, ultra-fast JavaScript runtime & package manager (which uses `bun.lock`).
- **Why we use `npm` in LUMA**: `npm` is 100% compatible with every cloud platform (Cloudflare, Vercel, Lovable, GitHub Actions).

---

## 4. 🗂️ Dependency Breakdown (`package.json`)

### Core Framework & Routing
- `@tanstack/react-start` & `@tanstack/react-router`: Modern fullstack framework for type-safe routing and server functions.
- `react` & `react-dom` (v19): Core library for rendering interactive components.
- `vite`: Next-generation dev server and bundler.

### Database & Backend
- `@supabase/supabase-js`: Official JavaScript client to query PostgreSQL, manage user auth, and listen to real-time events.

### UI & Styling
- `tailwindcss` & `@tailwindcss/vite`: Utility-first CSS framework for fast styling.
- `lucide-react`: Modern vector icon set (arrows, shields, stars, volume, pause icons).
- `@radix-ui/react-*`: Unstyled, accessible UI components (dialogs, dropdowns, tooltips, sliders, tabs).
- `clsx` & `tailwind-merge`: Utility functions to conditionally merge Tailwind CSS classes cleanly.
- `class-variance-authority`: Manages component UI variants (e.g. `button` primary vs secondary vs danger).

### Forms & Validation
- `react-hook-form` & `zod`: High-performance form state management paired with schema validation.
- `@hookform/resolvers`: Connects Zod validation schemas directly into React Hook Form.

### Data Visualization & Notifications
- `recharts`: Charting library for stats and analytics.
- `sonner`: Toast notification library (displays popup banners for achievements or alerts).

---

## 5. 🔁 Daily Workflow for LUMA
1. **Learn & Experiment**: Read the code files, modify logic locally, test on `http://localhost:8080`.
2. **Document Learnings**: Record new concepts and notes in `learnings.md`.
3. **Commit & Push**: Push clean daily commits to `https://github.com/TushalLohar/LUMA.git`.
4. **Deploy**: Sync with Lovable to update your live link!
