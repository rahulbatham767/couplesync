import { NextRequest, NextResponse } from 'next/server'
import { getRedis, redisGetRoomByCode, redisUpdateRoom, redisPublishEvent } from '@/lib/redis'

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return url.startsWith('https://') && !url.includes('placeholder') && key.length > 20
}

export async function POST(req: NextRequest) {
  try {
    const { userId, code } = await req.json()
    if (!userId || !code) return NextResponse.json({ error: 'userId and code required' }, { status: 400 })

    const upperCode = code.toUpperCase()
    const redis = getRedis()

    // ── Redis path ───────────────────────────────────────────────────────────
    if (redis) {
      const room = await redisGetRoomByCode(upperCode)
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
      if (room.user2_id && room.user2_id !== userId) return NextResponse.json({ error: 'Room is full' }, { status: 409 })
      if (room.user1_id === userId) return NextResponse.json({ room, backend: 'redis' })

      const updated = await redisUpdateRoom(room.id, {
        user2_id: userId,
        status: 'active',
      })

      // Publish join event so user1 gets notified instantly
      await redisPublishEvent(room.id, {
        type: 'partner_joined',
        userId,
        timestamp: Date.now(),
      })

      return NextResponse.json({ room: updated, backend: 'redis' })
    }

    // ── Supabase fallback ────────────────────────────────────────────────────
    if (isSupabaseConfigured()) {
      const { supabase } = await import('@/lib/supabase')
      const { data: existing, error: fetchErr } = await supabase
        .from('rooms').select().eq('code', upperCode).single()
      if (fetchErr || !existing) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
      if (existing.user2_id && existing.user2_id !== userId) return NextResponse.json({ error: 'Room is full' }, { status: 409 })
      if (existing.user1_id === userId) return NextResponse.json({ room: existing, backend: 'supabase' })

      const { data, error } = await supabase
        .from('rooms')
        .update({ user2_id: userId, status: 'active' })
        .eq('id', existing.id).select().single()
      if (error) throw error
      return NextResponse.json({ room: data, backend: 'supabase' })
    }

    return NextResponse.json({ error: 'No backend configured' }, { status: 500 })
  } catch (err: unknown) {
    console.error('Join room error:', err)
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 })
  }
}
