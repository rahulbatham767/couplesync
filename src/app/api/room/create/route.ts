import { NextRequest, NextResponse } from 'next/server'
import { getRedis, redisCreateRoom, RedisRoom } from '@/lib/redis'
import { getQuestionsForRoom } from '@/lib/questions'
import { v4 as uuidv4 } from 'uuid'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return url.startsWith('https://') && !url.includes('placeholder') && key.length > 20
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const code = generateCode()
    const roomId = uuidv4()
    const questions = getQuestionsForRoom(code)
    const questionIds = questions.map(q => q.id)

    const redis = getRedis()

    // ── Redis path (preferred — fast, scalable) ──────────────────────────────
    if (redis) {
      const room: RedisRoom = {
        id: roomId,
        code,
        status: 'waiting',
        user1_id: userId,
        user2_id: null,
        current_question: 0,
        compatibility_score: null,
        question_ids: questionIds,
        answers: {},
        created_at: Date.now(),
      }
      await redisCreateRoom(room)
      return NextResponse.json({ room, questionIds, backend: 'redis' })
    }

    // ── Supabase fallback ────────────────────────────────────────────────────
    if (isSupabaseConfigured()) {
      // Dynamic import to avoid errors if supabase not configured
      const { supabase } = await import('@/lib/supabase')
      const { data, error } = await supabase
        .from('rooms')
        .insert({ id: roomId, code, user1_id: userId, status: 'waiting', current_question: 0 })
        .select().single()
      if (error) throw error
      return NextResponse.json({ room: data, questionIds, backend: 'supabase' })
    }

    // ── Local fallback ───────────────────────────────────────────────────────
    return NextResponse.json({
      room: {
        id: roomId, code, status: 'waiting',
        user1_id: userId, user2_id: null,
        current_question: 0, compatibility_score: null,
      },
      questionIds,
      backend: 'local',
    })
  } catch (err: unknown) {
    console.error('Create room error:', err)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}
