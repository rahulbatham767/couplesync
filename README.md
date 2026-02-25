---
title: Couplesync
emoji: 🐠
colorFrom: indigo
colorTo: blue
sdk: docker
pinned: false
short_description: CoupleSync is a fun, interactive relationship game designed.
---

Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference

# 💞 CoupleSync — Real-Time Compatibility Quiz

A luxury dark mode couple's compatibility quiz with real-time sync via Supabase, 3D visuals, and cinematic reveal animations.

## ✨ Features

- **3D Hero Scene** — React Three Fiber floating heart with distortion effects & particle stars
- **Real-time Sync** — Supabase Realtime channels sync partner answers instantly
- **5-Question Quiz** — Beautifully designed compatibility quiz with animated answer options
- **Cinematic Reveal** — Counting score animation, compatibility bar, and confetti particles
- **Reel Mode** — Toggle 9:16 letterboxing for TikTok/Reels screen recording
- **Persistent Data** — Rooms and responses stored in Supabase PostgreSQL
- **Luxury Dark Mode** — Pink/purple neon aesthetic with Framer Motion transitions

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `src/lib/schema.sql`
3. Copy your project URL and anon key from Settings → API

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Schema

Run `src/lib/schema.sql` in your Supabase SQL editor to create:

- **`rooms`** table — Stores room codes, user IDs, status, and compatibility scores
- **`responses`** table — Stores individual user answers per question
- Realtime enabled on both tables
- Row Level Security policies configured

## 🎨 Tech Stack

| Technology | Usage |
|---|---|
| Next.js 15 (App Router) | Framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| React Three Fiber | 3D scene |
| @react-three/drei | 3D helpers |
| Three.js | 3D rendering |
| Supabase | Database + Realtime |
| Lucide React | Icons |

## 📱 Reel Mode

Click the "Reel Mode" button in the top-right to:
- Add 9:16 black letterbox bars
- Zoom the 3D camera closer
- Perfect for screen recording TikToks/Reels

## 🔧 Customization

### Add More Questions
Edit `src/lib/questions.ts` — add to `QUIZ_QUESTIONS` array.

### Customize Colors
Edit `tailwind.config.js` to change the neon accent colors.

### Adjust Compatibility Algorithm
Modify `calculateCompatibility()` in `src/lib/questions.ts`.

### Change 3D Shape
Edit `src/components/HeroScene.tsx` — swap heart geometry for any Three.js geometry.

## 🚀 Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add your environment variables in the Vercel dashboard.

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout + fonts
│   ├── page.tsx            # Main app orchestrator
│   └── globals.css         # Luxury dark mode styles
├── components/
│   ├── HeroScene.tsx       # React Three Fiber 3D scene
│   ├── RoomLobby.tsx       # Create/join room UI
│   ├── QuizSection.tsx     # Quiz with real-time status
│   ├── CompatibilityReveal.tsx  # Cinematic result reveal
│   └── ReelToggle.tsx      # 9:16 reel mode toggle
├── hooks/
│   └── useRoom.ts          # Supabase realtime hook
└── lib/
    ├── supabase.ts          # Supabase client + types
    ├── questions.ts         # Quiz data + scoring
    └── schema.sql           # Database schema
```
