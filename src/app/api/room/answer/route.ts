import { NextRequest, NextResponse } from 'next/server'
import { getRedis, redisGetRoom, redisUpdateRoom, redisPublishEvent } from '@/lib/redis'
import { ALL_QUESTIONS, calculateCompatibility } from '@/lib/questions'

export const runtime = 'nodejs'

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return url.startsWith('https://') && !url.includes('placeholder') && key.length > 20
}

export async function POST(req: NextRequest) {
  try {
    const { roomId, userId, questionIndex, answer } = await req.json()
    if (!roomId || !userId || questionIndex === undefined || !answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const redis = getRedis()

    if (redis) {
      // ── STEP 1: Write this user's answer with a per-answer lock ─────────────
      // The lock ensures only ONE write happens for this user+question combo,
      // AND serializes the bothAnswered check so both can't miss each other.
      const answerLockKey = `lock:answer:${roomId}:${questionIndex}`

      // Acquire lock — retry up to 5 times with 100ms delay (handles tight races)
      let lockAcquired = false
      for (let attempt = 0; attempt < 5; attempt++) {
        const locked = await redis.set(answerLockKey, userId, { nx: true, ex: 15 })
        if (locked) { lockAcquired = true; break }
        // Another request is writing — wait briefly
        await new Promise(r => setTimeout(r, 100))
      }

      // Read freshest room state (after any concurrent write completes)
      const room = await redisGetRoom(roomId)
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

      // Already advanced past this question — idempotent return
      if (room.current_question !== questionIndex) {
        return NextResponse.json({ success: true, room, backend: 'redis', skipped: true })
      }

      const partnerId = room.user1_id === userId ? room.user2_id : room.user1_id
      const answerKey = `${userId}:${questionIndex}`

      // Write answer into room.answers — single source of truth
      const updatedAnswers = { ...room.answers, [answerKey]: answer }
      let updatedRoom = { ...room, answers: updatedAnswers }
      await redisUpdateRoom(roomId, updatedRoom)

      // Release the per-answer lock now that we've written
      await redis.del(answerLockKey)

      // Publish so partner sees this answer
      await redisPublishEvent(roomId, {
        type: 'answer_submitted',
        userId,
        questionIndex,
        answer,
        timestamp: Date.now(),
      })

      // ── STEP 2: Check if both answered ──────────────────────────────────────
      const partnerAnswerKey = partnerId ? `${partnerId}:${questionIndex}` : null
      const partnerAnswered = partnerAnswerKey ? !!updatedAnswers[partnerAnswerKey] : false

      if (partnerAnswered && partnerId) {
        // Both answered — acquire the advance lock (only one request advances)
        const advanceLockKey = `lock:advance:${roomId}:${questionIndex}`
        const advanceLocked = await redis.set(advanceLockKey, '1', { nx: true, ex: 10 })

        if (advanceLocked) {
          // We won the lock — advance the question
          const freshRoom = await redisGetRoom(roomId)
          if (!freshRoom) return NextResponse.json({ success: true, room: updatedRoom, backend: 'redis' })

          // Bail if already advanced (another server may have done it)
          if (freshRoom.current_question !== questionIndex) {
            return NextResponse.json({ success: true, room: freshRoom, backend: 'redis' })
          }

          const totalQuestions = freshRoom.question_ids.length
          const nextQ = questionIndex + 1

          if (nextQ >= totalQuestions) {
            // ── GAME OVER: calculate final score ─────────────────────────────
            const questions = freshRoom.question_ids
              .map(id => ALL_QUESTIONS.find(q => q.id === id)!)
              .filter(Boolean)

            // Build answer maps indexed by position (0–4) for calculateCompatibility
            const userAns: Record<number, string> = {}
            const partnerAns: Record<number, string> = {}

            questions.forEach((_, i) => {
              const ua = freshRoom.answers[`${userId}:${i}`]
              const pa = freshRoom.answers[`${partnerId}:${i}`]
              if (ua) userAns[i] = ua
              if (pa) partnerAns[i] = pa
            })

            const score = calculateCompatibility(userAns, partnerAns, questions)
            const completedRoom = {
              ...freshRoom,
              status: 'completed' as const,
              compatibility_score: score,
              current_question: nextQ,
            }
            await redisUpdateRoom(roomId, completedRoom)
            await redisPublishEvent(roomId, { type: 'game_completed', score, timestamp: Date.now() })
            updatedRoom = completedRoom
          } else {
            // ── ADVANCE TO NEXT QUESTION ──────────────────────────────────────
            const advancedRoom = { ...freshRoom, current_question: nextQ }
            await redisUpdateRoom(roomId, advancedRoom)
            await redisPublishEvent(roomId, {
              type: 'question_advanced',
              questionIndex: nextQ,
              timestamp: Date.now(),
            })
            updatedRoom = advancedRoom
          }
        }
        // If we didn't get the advance lock, the other request will handle it
        // and both players get notified via SSE
      }

      // Return latest room state
      const finalRoom = await redisGetRoom(roomId)
      return NextResponse.json({ success: true, room: finalRoom || updatedRoom, backend: 'redis' })
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
  } catch (err) {
    console.error('Answer error:', err)
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 })
  }
}