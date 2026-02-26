import { NextRequest, NextResponse } from 'next/server'
import { getRedis, redisGetRoom, redisUpdateRoom, redisPublishEvent } from '@/lib/redis'
import { ALL_QUESTIONS, calculateCompatibility } from '@/lib/questions'

export const runtime = 'nodejs'

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return url.startsWith('https://') && !url.includes('placeholder') && key.length > 20
}

async function advanceQuestion(
  redis: NonNullable<ReturnType<typeof getRedis>>,
  roomId: string,
  questionIndex: number,
  userId: string,
  partnerId: string,
): Promise<{ advanced: boolean; room: Awaited<ReturnType<typeof redisGetRoom>> }> {
  // ── ATOMIC LOCK ─────────────────────────────────────────────────────────────
  // Only ONE request should advance the question — use Redis SET NX (set if not exists)
  // as a distributed lock. The lock key is per-room per-question so it auto-releases.
  const lockKey = `lock:advance:${roomId}:${questionIndex}`

  // SET lock NX EX 10  →  only succeeds for the FIRST caller
  const locked = await redis.set(lockKey, '1', { nx: true, ex: 10 })
  if (!locked) {
    // Another request already has the lock — it will handle advancing
    return { advanced: false, room: await redisGetRoom(roomId) }
  }

  // We have the lock — read the definitive room state and advance
  const room = await redisGetRoom(roomId)
  if (!room) return { advanced: false, room: null }

  // If already advanced past this question, nothing to do
  if (room.current_question > questionIndex) {
    return { advanced: false, room }
  }

  const totalQuestions = room.question_ids.length
  const nextQ = questionIndex + 1

  if (nextQ >= totalQuestions) {
    // ── GAME OVER ──────────────────────────────────────────────────────────────
    const questions = room.question_ids
      .map(id => ALL_QUESTIONS.find(q => q.id === id)!)
      .filter(Boolean)

    const userAns: Record<number, string> = {}
    const partnerAns: Record<number, string> = {}
    questions.forEach((_, i) => {
      if (room.answers[`${userId}:${i}`]) userAns[i] = room.answers[`${userId}:${i}`]
      if (room.answers[`${partnerId}:${i}`]) partnerAns[i] = room.answers[`${partnerId}:${i}`]
    })

    const score = calculateCompatibility(userAns, partnerAns, questions)
    const updatedRoom = { ...room, status: 'completed' as const, compatibility_score: score, current_question: nextQ }
    await redisUpdateRoom(roomId, updatedRoom)
    await redisPublishEvent(roomId, { type: 'game_completed', score, timestamp: Date.now() })
    return { advanced: true, room: updatedRoom }
  } else {
    // ── NEXT QUESTION ──────────────────────────────────────────────────────────
    const updatedRoom = { ...room, current_question: nextQ }
    await redisUpdateRoom(roomId, updatedRoom)
    await redisPublishEvent(roomId, { type: 'question_advanced', questionIndex: nextQ, timestamp: Date.now() })
    return { advanced: true, room: updatedRoom }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { roomId, userId, questionIndex, answer } = await req.json()
    if (!roomId || !userId || questionIndex === undefined || !answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const redis = getRedis()

    // ── REDIS PATH ─────────────────────────────────────────────────────────────
    if (redis) {
      const room = await redisGetRoom(roomId)
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

      // Guard: don't accept answers for already-advanced questions
      if (room.current_question !== questionIndex) {
        return NextResponse.json({ success: true, room, backend: 'redis', skipped: true })
      }

      const partnerId = room.user1_id === userId ? room.user2_id : room.user1_id
      const answerKey = `${userId}:${questionIndex}`

      // ── STEP 1: Write this user's answer atomically ─────────────────────────
      // Use HSETNX on a answers hash so concurrent writes don't clobber each other
      const answerHashKey = `answers:${roomId}`
      await redis.hsetnx(answerHashKey, answerKey, answer)
      await redis.expire(answerHashKey, 60 * 60 * 2)

      // Read all answers for this room from the hash (single consistent read)
      const allAnswers = (await redis.hgetall(answerHashKey)) as Record<string, string> | null
      const answers = allAnswers || {}

      // Merge into room answers and save
      const mergedAnswers = { ...room.answers, ...answers, [answerKey]: answer }
      await redisUpdateRoom(roomId, { ...room, answers: mergedAnswers })

      // Publish that this user answered (so partner sees their choice)
      await redisPublishEvent(roomId, {
        type: 'answer_submitted',
        userId,
        questionIndex,
        answer,
        timestamp: Date.now(),
      })

      // ── STEP 2: Check if both answered ─────────────────────────────────────
      const partnerAnswerKey = partnerId ? `${partnerId}:${questionIndex}` : null
      const bothAnswered = partnerAnswerKey && answers[partnerAnswerKey]

      let finalRoom = await redisGetRoom(roomId)

      if (bothAnswered && partnerId) {
        // Try to acquire the advance lock — only one of the two concurrent requests wins
        const { advanced, room: advancedRoom } = await advanceQuestion(
          redis, roomId, questionIndex, userId, partnerId
        )
        if (advancedRoom) finalRoom = advancedRoom
      }

      return NextResponse.json({ success: true, room: finalRoom, backend: 'redis' })
    }

    // ── SUPABASE FALLBACK ──────────────────────────────────────────────────────
    if (isSupabaseConfigured()) {
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('responses').upsert(
        { room_id: roomId, user_id: userId, question_index: questionIndex, answer },
        { onConflict: 'room_id,user_id,question_index' }
      )
      return NextResponse.json({ success: true, backend: 'supabase' })
    }

    return NextResponse.json({ error: 'No backend configured' }, { status: 500 })
  } catch (err: unknown) {
    console.error('Answer error:', err)
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 })
  }
}