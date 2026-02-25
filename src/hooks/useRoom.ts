'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateCompatibility, getQuestionsForRoom, QUIZ_QUESTIONS, Question } from '@/lib/questions'
import { v4 as uuidv4 } from 'uuid'

export interface RoomState {
  id: string
  code: string
  status: 'waiting' | 'active' | 'completed'
  user1_id: string | null
  user2_id: string | null
  current_question: number
  compatibility_score: number | null
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return url.startsWith('https://') && !url.includes('placeholder') && key.length > 20 && !key.includes('placeholder')
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
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
  const [usingLocalMode, setUsingLocalMode] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const isUser1 = room?.user1_id === userId

  const createRoom = useCallback(async () => {
    setLoading(true)
    setError(null)
    const code = generateCode()
    const roomQuestions = getQuestionsForRoom(code)
    setQuestions(roomQuestions)

    if (!isSupabaseConfigured()) {
      setRoom({ id: uuidv4(), code, status: 'waiting', user1_id: userId, user2_id: null, current_question: 0, compatibility_score: null })
      setUsingLocalMode(true)
      setLoading(false)
      return
    }

    try {
      // FIX: Use maybeSingle() to handle potential race conditions during insertion
      const { data, error: err } = await supabase
        .from('rooms')
        .insert({ code, user1_id: userId, status: 'waiting', current_question: 0 })
        .select()
        .maybeSingle()

      if (err) throw err
      if (data) setRoom(data as RoomState)
    } catch (err: any) {
      console.warn('Supabase error, falling back to local mode:', err)
      setRoom({ id: uuidv4(), code, status: 'waiting', user1_id: userId, user2_id: null, current_question: 0, compatibility_score: null })
      setUsingLocalMode(true)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const joinRoom = useCallback(async (code: string) => {
    setLoading(true)
    setError(null)
    const upperCode = code.trim().toUpperCase()
    setQuestions(getQuestionsForRoom(upperCode))

    if (usingLocalMode || !isSupabaseConfigured()) {
      if (room && room.code === upperCode) {
        setRoom({ ...room, user2_id: userId, status: 'active' })
        setUsingLocalMode(true)
        setLoading(false)
        return
      }
      setError('Room not found (local mode)')
      setLoading(false)
      return
    }

    try {
      // THE PRIMARY FIX: Change .single() to .maybeSingle()
      // This prevents the PGRST116 error if the room code doesn't exist
      const { data: existing, error: fetchErr } = await supabase
        .from('rooms')
        .select()
        .eq('code', upperCode)
        .maybeSingle()

      if (fetchErr) throw fetchErr

      // Manually handle the "0 rows" case
      if (!existing) {
        throw new Error('Room not found. Please check the code.')
      }

      if (existing.user2_id && existing.user2_id !== userId) {
        throw new Error('This room is full.')
      }

      if (existing.user1_id === userId) {
        setRoom(existing as RoomState)
        setLoading(false)
        return
      }

      // Update the room to add the partner
      const { data, error: updateErr } = await supabase
        .from('rooms')
        .update({ user2_id: userId, status: 'active' })
        .eq('id', existing.id)
        .select()
        .maybeSingle()

      if (updateErr) throw updateErr
      if (data) setRoom(data as RoomState)

    } catch (err: any) {
      setError(err.message || 'Failed to join room')
    } finally {
      setLoading(false)
    }
  }, [userId, room, usingLocalMode])

  const submitAnswer = useCallback(async (questionIndex: number, answer: string) => {
    if (!room) return
    const newUserAnswers = { ...userAnswers, [questionIndex]: answer }
    setUserAnswers(newUserAnswers)

    if (usingLocalMode) {
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
      }, 1200 + Math.random() * 800)
      return
    }

    try {
      const { error: err } = await supabase.from('responses').upsert(
        { room_id: room.id, user_id: userId, question_index: questionIndex, answer },
        { onConflict: 'room_id,user_id,question_index' }
      )
      if (err) throw err

      const partnerId = isUser1 ? room.user2_id : room.user1_id
      if (partnerId && partnerAnswers[questionIndex] !== undefined) {
        const nextQ = questionIndex + 1
        if (nextQ >= questions.length) {
          const score = calculateCompatibility(newUserAnswers, { ...partnerAnswers }, questions)
          await supabase.from('rooms').update({
            status: 'completed',
            compatibility_score: score,
            current_question: nextQ
          }).eq('id', room.id)
        } else {
          await supabase.from('rooms').update({ current_question: nextQ }).eq('id', room.id)
        }
      }
    } catch (err: any) {
      console.error('Failed to submit answer:', err)
    }
  }, [room, userId, isUser1, partnerAnswers, userAnswers, usingLocalMode, questions])

  useEffect(() => {
    if (!room || usingLocalMode || !isSupabaseConfigured()) return
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const ch = supabase
      .channel(`room:${room.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          const updated = payload.new as RoomState
          setRoom(updated)
          if (updated.compatibility_score !== null) setCompatibilityScore(updated.compatibility_score)
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'responses', filter: `room_id=eq.${room.id}` },
        (payload) => {
          const r = payload.new as { user_id: string; question_index: number; answer: string }
          if (r.user_id !== userId) {
            setPartnerAnswers(prev => ({ ...prev, [r.question_index]: r.answer }))
            setPartnerAnsweredCurrent(true)
            setTimeout(() => setPartnerAnsweredCurrent(false), 2000)
          }
        })
      .subscribe()

    channelRef.current = ch
    return () => { if (ch) supabase.removeChannel(ch) }
  }, [room?.id, usingLocalMode, userId])

  useEffect(() => {
    if (!room || room.status === 'waiting' || usingLocalMode || !isSupabaseConfigured()) return
    supabase.from('responses').select().eq('room_id', room.id).then(({ data }) => {
      if (!data) return
      const mine: Record<number, string> = {}
      const theirs: Record<number, string> = {}
      data.forEach(r => {
        if (r.user_id === userId) mine[r.question_index] = r.answer
        else theirs[r.question_index] = r.answer
      })
      setUserAnswers(mine)
      setPartnerAnswers(theirs)
    })
  }, [room?.id, room?.status, userId, usingLocalMode])

  const leaveRoom = useCallback(() => {
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    setRoom(null)
    setQuestions(QUIZ_QUESTIONS)
    setUserAnswers({})
    setPartnerAnswers({})
    setCompatibilityScore(null)
    setError(null)
    setUsingLocalMode(false)
  }, [])

  return { userId, room, questions, userAnswers, partnerAnswers, partnerAnsweredCurrent, loading, error, compatibilityScore, usingLocalMode, createRoom, joinRoom, submitAnswer, leaveRoom, isUser1 }
}