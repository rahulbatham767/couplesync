import { Redis } from '@upstash/redis'

function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL || ''
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || ''
  return url.startsWith('https://') && token.length > 10
}

let _redis: Redis | null = null

export function getRedis(): Redis | null {
  if (!isRedisConfigured()) return null
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return _redis
}

export interface RedisRoom {
  id: string
  code: string
  status: 'waiting' | 'active' | 'completed'
  user1_id: string
  user2_id: string | null
  current_question: number
  compatibility_score: number | null
  question_ids: number[]
  answers: Record<string, string>
  created_at: number
}

export type RoomEvent =
  | { type: 'partner_joined'; userId: string; timestamp: number }
  | { type: 'answer_submitted'; userId: string; questionIndex: number; answer: string; timestamp: number }
  | { type: 'question_advanced'; questionIndex: number; timestamp: number }
  | { type: 'game_completed'; score: number; timestamp: number }

const ROOM_TTL = 60 * 60 * 2 // 2 hours

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeParseEvent(item: unknown): RoomEvent | null {
  try {
    if (typeof item === 'string') return JSON.parse(item) as RoomEvent
    if (typeof item === 'object' && item !== null) return item as RoomEvent
    return null
  } catch {
    return null
  }
}

// ── Room CRUD ─────────────────────────────────────────────────────────────────

export async function redisCreateRoom(room: RedisRoom): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  await Promise.all([
    redis.setex(`room:${room.id}`, ROOM_TTL, JSON.stringify(room)),
    redis.setex(`code:${room.code}`, ROOM_TTL, room.id),
  ])
}

export async function redisGetRoom(roomId: string): Promise<RedisRoom | null> {
  const redis = getRedis()
  if (!redis) return null
  const data = await redis.get(`room:${roomId}`)
  if (!data) return null
  try {
    return typeof data === 'string' ? JSON.parse(data) : data as RedisRoom
  } catch {
    return null
  }
}

export async function redisGetRoomByCode(code: string): Promise<RedisRoom | null> {
  const redis = getRedis()
  if (!redis) return null
  const roomId = await redis.get(`code:${code}`)
  if (!roomId) return null
  return redisGetRoom(String(roomId))
}

export async function redisUpdateRoom(roomId: string, updates: Partial<RedisRoom>): Promise<RedisRoom | null> {
  const redis = getRedis()
  if (!redis) return null
  const room = await redisGetRoom(roomId)
  if (!room) return null
  const updated = { ...room, ...updates }
  await redis.setex(`room:${roomId}`, ROOM_TTL, JSON.stringify(updated))
  return updated
}

// ── Events ────────────────────────────────────────────────────────────────────
// Events stored in a Redis LIST — newest first (lpush).
// Each event has a timestamp so clients can filter to only new ones.

export async function redisPublishEvent(roomId: string, event: RoomEvent): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  const key = `events:${roomId}`
  // Always store as JSON string so lrange returns consistent types
  await redis.lpush(key, JSON.stringify(event))
  await redis.expire(key, ROOM_TTL)
  await redis.ltrim(key, 0, 199) // keep last 200 events
}

export async function redisGetNewEvents(roomId: string, afterTimestamp: number): Promise<RoomEvent[]> {
  const redis = getRedis()
  if (!redis) return []

  // Fetch all events (list is small — max 200, usually <20)
  const items = await redis.lrange(`events:${roomId}`, 0, -1)
  if (!items || items.length === 0) return []

  const events = items
    .map(safeParseEvent)
    .filter((e): e is RoomEvent => e !== null && e.timestamp > afterTimestamp)

  // Return in chronological order (oldest first) so client processes them in order
  return events.sort((a, b) => a.timestamp - b.timestamp)
}