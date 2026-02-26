'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateCompatibility, getQuestionsForRoom, ALL_QUESTIONS, QUIZ_QUESTIONS, Question } from '@/lib/questions'
import { v4 as uuidv4 } from 'uuid'

export type GameMode = 'redis' | 'supabase' | 'solo' | 'local'

export interface RoomState {
  id: string
  code: string
  status: 'waiting' | 'active' | 'completed'
  user1_id: string | null
  user2_id: string | null
  current_question: number
  compatibility_score: number | null
}

const SOLO_PERSONAS = [
  { name: 'Luna', bias: 0 },
  { name: 'Alex', bias: 1 },
  { name: 'River', bias: -1 },
]

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return url.startsWith('https://') && !url.includes('placeholder') && key.length > 20
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function getSoloAnswer(userAnswer: string, bias: number): string {
  const opts = ['a', 'b', 'c', 'd']
  const userIdx = opts.indexOf(userAnswer)
  if (bias === 1) {
    const r = Math.random()
    if (r < 0.50) return userAnswer
    if (r < 0.80) return opts[Math.max(0, Math.min(3, userIdx + (Math.random() > 0.5 ? 1 : -1)))]
    return opts[Math.floor(Math.random() * 4)]
  }
  if (bias === -1) {
    const r = Math.random()
    if (r < 0.50) return opts[(userIdx + 2) % 4]
    if (r < 0.80) return opts[Math.max(0, Math.min(3, userIdx + (Math.random() > 0.5 ? 1 : -1)))]
    return userAnswer
  }
  return opts[Math.floor(Math.random() * 4)]
}

// Parse answers map from Redis room into separate user/partner maps
function parseAnswers(
  answers: Record<string, string>,
  myUserId: string,
  partnerUserId: string | null,
): { mine: Record<number, string>; partner: Record<number, string> } {
  const mine: Record<number, string> = {}
  const partner: Record<number, string> = {}
  Object.entries(answers || {}).forEach(([key, val]) => {
    const colonIdx = key.lastIndexOf(':')
    if (colonIdx === -1) return
    const uid = key.substring(0, colonIdx)
    const qIdx = parseInt(key.substring(colonIdx + 1))
    if (uid === myUserId) mine[qIdx] = val
    else if (!partnerUserId || uid === partnerUserId) partner[qIdx] = val
  })
  return { mine, partner }
}

export function useRoom() {
  const [userId] = useState<string>(() => {
    if (typeof window === 'undefined') return uuidv4()
    const stored = sessionStorage.getItem('couplesync_user_id')
    if (stored) return stored
    const id = uuidv4()
    sessionStorage.setItem('couplesync_user_id', id)
    return id
  })

  const [room, setRoom] = useState<RoomState | null>(null)
  const [questions, setQuestions] = useState<Question[]>(QUIZ_QUESTIONS)
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const [partnerAnswers, setPartnerAnswers] = useState<Record<number, string>>({})
  const [partnerAnsweredCurrent, setPartnerAnsweredCurrent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [compatibilityScore, setCompatibilityScore] = useState<number | null>(null)
  const [gameMode, setGameMode] = useState<GameMode>('local')
  const [soloPersona] = useState(() => SOLO_PERSONAS[Math.floor(Math.random() * SOLO_PERSONAS.length)])
  const [partnerName, setPartnerName] = useState<string | null>(null)

  const sseRef = useRef<EventSource | null>(null)
  const lastTsRef = useRef<number>(0)
  const roomIdRef = useRef<string | null>(null) // stable ref for reconnect closure
  const supabaseChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const isUser1 = room?.user1_id === userId

  // ── SSE CONNECTION ────────────────────────────────────────────────────────────
  const connectSSE = useCallback((roomId: string) => {
    // Close existing connection
    if (sseRef.current) {
      sseRef.current.close()
      sseRef.current = null
    }

    roomIdRef.current = roomId
    const url = `/api/room/events?roomId=${roomId}&userId=${encodeURIComponent(userId)}&lastTs=${lastTsRef.current}`
    const es = new EventSource(url)

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)

        // Always advance lastTs so reconnects don't replay old events
        if (event.timestamp && event.timestamp > lastTsRef.current) {
          lastTsRef.current = event.timestamp
        }

        switch (event.type) {

          case 'connected':
            // Server acknowledged — nothing to do
            break

          case 'partner_joined':
            // Partner joined → set room active (triggers page useEffect → quiz)
            setRoom(prev => {
              if (!prev) return prev
              return { ...prev, status: 'active', user2_id: event.userId }
            })
            break

          case 'answer_submitted':
            // Partner answered a question
            if (event.userId !== userId) {
              setPartnerAnswers(prev => ({ ...prev, [event.questionIndex]: event.answer }))
              setPartnerAnsweredCurrent(true)
              setTimeout(() => setPartnerAnsweredCurrent(false), 2000)
            }
            break

          case 'question_advanced':
            // Both answered — move to next question (fired for the player who answered FIRST/waited)
            // Show partner answered pill briefly before advancing
            setPartnerAnsweredCurrent(true)
            setTimeout(() => setPartnerAnsweredCurrent(false), 1200)
            // Small delay so user sees the "partner answered" pill before question changes
            setTimeout(() => {
              setRoom(prev => prev ? { ...prev, current_question: event.questionIndex } : prev)
            }, 600)
            break

          case 'game_completed':
            // Game over
            setCompatibilityScore(event.score)
            setRoom(prev => prev ? { ...prev, status: 'completed', compatibility_score: event.score } : prev)
            break

          case 'room_sync': {
            // Full room state sync (sent every 10s as safety net)
            const syncedRoom = event.room
            if (!syncedRoom) break

            setRoom(prev => {
              if (!prev) return prev
              return {
                ...prev,
                status: syncedRoom.status,
                user2_id: syncedRoom.user2_id,
                current_question: syncedRoom.current_question,
                compatibility_score: syncedRoom.compatibility_score,
              }
            })

            // Sync answers from room state
            if (syncedRoom.answers) {
              const partnerUserId = syncedRoom.user1_id === userId
                ? syncedRoom.user2_id
                : syncedRoom.user1_id
              const { mine, partner } = parseAnswers(syncedRoom.answers, userId, partnerUserId)
              if (Object.keys(mine).length > 0) setUserAnswers(prev => ({ ...prev, ...mine }))
              if (Object.keys(partner).length > 0) setPartnerAnswers(prev => ({ ...prev, ...partner }))
            }

            if (syncedRoom.compatibility_score !== null) {
              setCompatibilityScore(syncedRoom.compatibility_score)
            }
            break
          }

          case 'reconnect':
            // Server rotating connection — reconnect with latest timestamp
            if (event.lastTs) lastTsRef.current = event.lastTs
            es.close()
            if (roomIdRef.current) {
              setTimeout(() => connectSSE(roomIdRef.current!), 300)
            }
            break
        }
      } catch (err) {
        console.error('SSE parse error:', err)
      }
    }

    es.onerror = () => {
      // Don't reconnect if we intentionally closed
      if (sseRef.current !== es) return
      es.close()
      sseRef.current = null
      // Reconnect after 2s, passing current lastTs so no event replay
      if (roomIdRef.current) {
        setTimeout(() => {
          if (roomIdRef.current) connectSSE(roomIdRef.current)
        }, 2000)
      }
    }

    sseRef.current = es
  }, [userId])

  // ── SUPABASE REALTIME ─────────────────────────────────────────────────────────
  const connectSupabase = useCallback((roomId: string) => {
    if (supabaseChannelRef.current) supabase.removeChannel(supabaseChannelRef.current)
    const ch = supabase
      .channel(`room:${roomId}:${Date.now()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const updated = payload.new as RoomState
          setRoom(updated)
          if (updated.compatibility_score !== null) setCompatibilityScore(updated.compatibility_score)
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'responses', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const r = payload.new as { user_id: string; question_index: number; answer: string }
          if (r.user_id !== userId) {
            setPartnerAnswers(prev => ({ ...prev, [r.question_index]: r.answer }))
            setPartnerAnsweredCurrent(true)
            setTimeout(() => setPartnerAnsweredCurrent(false), 2000)
          }
        })
      .subscribe()
    supabaseChannelRef.current = ch
  }, [userId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sseRef.current) { sseRef.current.close(); sseRef.current = null }
      roomIdRef.current = null
      if (supabaseChannelRef.current) supabase.removeChannel(supabaseChannelRef.current)
    }
  }, [])

  // ── CREATE ROOM ───────────────────────────────────────────────────────────────
  const createRoom = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create room')

      const roomQuestions = data.questionIds
        ? data.questionIds.map((id: number) => ALL_QUESTIONS.find(q => q.id === id)!).filter(Boolean)
        : getQuestionsForRoom(data.room.code)

      setQuestions(roomQuestions)
      setRoom(data.room)
      setGameMode(data.backend as GameMode)
      lastTsRef.current = 0 // reset for new room

      if (data.backend === 'redis') connectSSE(data.room.id)
      else if (data.backend === 'supabase') connectSupabase(data.room.id)
    } catch (err: unknown) {
      // Full local fallback
      console.warn('API unavailable, using local mode:', err)
      const code = generateCode()
      const roomQuestions = getQuestionsForRoom(code)
      setQuestions(roomQuestions)
      setRoom({ id: uuidv4(), code, status: 'waiting', user1_id: userId, user2_id: null, current_question: 0, compatibility_score: null })
      setGameMode('local')
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [userId, connectSSE, connectSupabase])

  // ── SOLO MODE ─────────────────────────────────────────────────────────────────
  const startSolo = useCallback(() => {
    const code = generateCode()
    const roomQuestions = getQuestionsForRoom(code)
    setQuestions(roomQuestions)
    setRoom({ id: uuidv4(), code, status: 'active', user1_id: userId, user2_id: 'solo-partner', current_question: 0, compatibility_score: null })
    setPartnerName(soloPersona.name)
    setGameMode('solo')
    setUserAnswers({})
    setPartnerAnswers({})
    setCompatibilityScore(null)
    setError(null)
  }, [userId, soloPersona])

  // ── JOIN ROOM ─────────────────────────────────────────────────────────────────
  const joinRoom = useCallback(async (code: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to join room'); return }

      const roomQuestions = data.room?.question_ids
        ? data.room.question_ids.map((id: number) => ALL_QUESTIONS.find(q => q.id === id)!).filter(Boolean)
        : getQuestionsForRoom(data.room?.code || code)

      setQuestions(roomQuestions)
      setRoom(data.room)
      setGameMode(data.backend as GameMode)
      lastTsRef.current = 0

      if (data.backend === 'redis') connectSSE(data.room.id)
      else if (data.backend === 'supabase') connectSupabase(data.room.id)
    } catch {
      setError('Could not connect. Check your room code.')
    } finally {
      setLoading(false)
    }
  }, [userId, connectSSE, connectSupabase])

  // ── SUBMIT ANSWER ─────────────────────────────────────────────────────────────
  const submitAnswer = useCallback(async (questionIndex: number, answer: string) => {
    if (!room) return
    const newUserAnswers = { ...userAnswers, [questionIndex]: answer }
    setUserAnswers(newUserAnswers) // optimistic

    // Solo mode — AI partner responds
    if (gameMode === 'solo') {
      setTimeout(() => {
        const partnerChoice = getSoloAnswer(answer, soloPersona.bias)
        const newPartnerAnswers = { ...partnerAnswers, [questionIndex]: partnerChoice }
        setPartnerAnswers(newPartnerAnswers)
        setPartnerAnsweredCurrent(true)
        setTimeout(() => setPartnerAnsweredCurrent(false), 2000)
        const nextQ = questionIndex + 1
        if (nextQ >= questions.length) {
          const score = calculateCompatibility(newUserAnswers, newPartnerAnswers, questions)
          setCompatibilityScore(score)
          setRoom(prev => prev ? { ...prev, status: 'completed', compatibility_score: score, current_question: nextQ } : prev)
        } else {
          setRoom(prev => prev ? { ...prev, current_question: nextQ } : prev)
        }
      }, 800 + Math.random() * 1200)
      return
    }

    // Local mode — fully random partner
    if (gameMode === 'local') {
      setTimeout(() => {
        const opts = ['a', 'b', 'c', 'd']
        const partnerChoice = opts[Math.floor(Math.random() * opts.length)]
        const newPartnerAnswers = { ...partnerAnswers, [questionIndex]: partnerChoice }
        setPartnerAnswers(newPartnerAnswers)
        setPartnerAnsweredCurrent(true)
        setTimeout(() => setPartnerAnsweredCurrent(false), 2000)
        const nextQ = questionIndex + 1
        if (nextQ >= questions.length) {
          const score = calculateCompatibility(newUserAnswers, newPartnerAnswers, questions)
          setCompatibilityScore(score)
          setRoom(prev => prev ? { ...prev, status: 'completed', compatibility_score: score, current_question: nextQ } : prev)
        } else {
          setRoom(prev => prev ? { ...prev, current_question: nextQ } : prev)
        }
      }, 1000 + Math.random() * 1000)
      return
    }

    // Redis / Supabase — send to API
    try {
      const res = await fetch('/api/room/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, userId, questionIndex, answer }),
      })
      if (res.ok && gameMode === 'redis') {
        const data = await res.json()
        if (data.room) {
          const serverRoom = data.room
          // Both answered — advance immediately for the submitter
          // The OTHER player gets question_advanced via SSE
          if (serverRoom.current_question > questionIndex || serverRoom.status === 'completed') {
            setRoom(prev => prev ? {
              ...prev,
              status: serverRoom.status,
              current_question: serverRoom.current_question,
              compatibility_score: serverRoom.compatibility_score,
            } : prev)
            if (serverRoom.compatibility_score !== null) {
              setCompatibilityScore(serverRoom.compatibility_score)
            }
            // Pull partner's answer from server so their choice shows before advancing
            if (serverRoom.answers) {
              const partnerUserId = serverRoom.user1_id === userId
                ? serverRoom.user2_id
                : serverRoom.user1_id
              if (partnerUserId) {
                const partnerAns = serverRoom.answers[`${partnerUserId}:${questionIndex}`]
                if (partnerAns) {
                  setPartnerAnswers(prev => ({ ...prev, [questionIndex]: partnerAns }))
                  setPartnerAnsweredCurrent(true)
                  setTimeout(() => setPartnerAnsweredCurrent(false), 1200)
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Submit answer error:', err)
    }
  }, [room, userId, gameMode, userAnswers, partnerAnswers, questions, soloPersona])

  // ── LEAVE ROOM ────────────────────────────────────────────────────────────────
  const leaveRoom = useCallback(() => {
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null }
    roomIdRef.current = null
    lastTsRef.current = 0
    if (supabaseChannelRef.current) { supabase.removeChannel(supabaseChannelRef.current); supabaseChannelRef.current = null }
    setRoom(null)
    setQuestions(QUIZ_QUESTIONS)
    setUserAnswers({})
    setPartnerAnswers({})
    setCompatibilityScore(null)
    setError(null)
    setGameMode('local')
    setPartnerName(null)
  }, [])

  const isWaiting = room != null &&
    userAnswers[room.current_question] !== undefined &&
    partnerAnswers[room.current_question] === undefined

  return {
    userId, room, questions, userAnswers, partnerAnswers,
    partnerAnsweredCurrent, loading, error, compatibilityScore,
    gameMode, partnerName, isUser1, isWaiting,
    createRoom, startSolo, joinRoom, submitAnswer, leaveRoom,
  }
}