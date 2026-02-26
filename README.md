---
title: CoupleSync
emoji: 💞
colorFrom: pink
colorTo: purple
sdk: docker
pinned: false
license: mit
app_port: 7860
---

# 💞 CoupleSync

A real-time couple compatibility quiz with 3D visuals, Redis-powered live sync, and a solo AI demo mode.

## Features

- 🔴 **Real-time multiplayer** — both partners answer simultaneously via Redis + SSE
- 🤖 **Solo demo mode** — play against an AI partner (Luna / Alex / River)
- 🎨 **3D animated hearts** with React Three Fiber
- 📊 **100-question pool** — seeded random selection per room
- 📱 **Mobile optimized** — native share, safe-area, touch targets
- 🎬 **Cinematic reveal** — animated compatibility score screen

## Environment Variables

Set these in your Hugging Face Space secrets:

| Variable | Required | Description |
|----------|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | Recommended | Upstash Redis URL for real-time multiplayer |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended | Upstash Redis token |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Supabase fallback |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase fallback |

> Without Redis/Supabase, the app runs in **solo/demo mode** with no real-time multiplayer.

## Setup

1. Fork this Space
2. Add your `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in **Settings → Variables and secrets**
3. The Space will rebuild automatically
