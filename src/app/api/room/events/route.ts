import { NextRequest } from 'next/server'
import { getRedis, redisGetNewEvents, redisGetRoom } from '@/lib/redis'

// Node.js runtime — edge doesn't support long-running streams with setTimeout
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get('roomId')
  const userId = searchParams.get('userId')
  const lastTs = parseInt(searchParams.get('lastTs') || '0')

  if (!roomId || !userId) {
    return new Response('roomId and userId required', { status: 400 })
  }

  const redis = getRedis()
  if (!redis) {
    return new Response('Redis not configured', { status: 503 })
  }

  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
        }
      }

      // Send connected ack immediately
      send({ type: 'connected', roomId, timestamp: Date.now() })

      let currentLastTs = lastTs
      let pollCount = 0

      // Poll loop — runs every 1s for up to 55s then asks client to reconnect
      // (Vercel/serverless max function duration ~60s)
      while (!closed && pollCount < 55) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        if (closed) break
        pollCount++

        try {
          // Fetch events newer than what client has already seen
          const events = await redisGetNewEvents(roomId, currentLastTs)

          for (const event of events) {
            // Skip user's own answer events (they already applied optimistically)
            if (event.type === 'answer_submitted' && 'userId' in event && event.userId === userId) {
              if (event.timestamp > currentLastTs) currentLastTs = event.timestamp
              continue
            }
            send(event)
            if (event.timestamp > currentLastTs) currentLastTs = event.timestamp
          }

          // Every 10s send full room state as a safety sync
          if (pollCount % 10 === 0) {
            const room = await redisGetRoom(roomId)
            if (room) {
              send({ type: 'room_sync', room, timestamp: Date.now() })
              // If game is over stop polling
              if (room.status === 'completed') break
            }
          }

        } catch (err) {
          console.error('SSE poll error:', err)
        }
      }

      // Tell client to reconnect (not an error — just rotation)
      if (!closed) {
        send({ type: 'reconnect', lastTs: currentLastTs, timestamp: Date.now() })
        try { controller.close() } catch { }
      }
    },

    cancel() {
      closed = true
    },
  })

  // Abort signal cleanup
  req.signal.addEventListener('abort', () => { closed = true })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  })
}