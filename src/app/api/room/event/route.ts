import { NextRequest } from 'next/server'
import { getRedis, redisGetNewEvents, redisGetRoom } from '@/lib/redis'

export const runtime = 'edge' // Use edge runtime for lower latency

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

    // Server-Sent Events stream
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        async start(controller) {
            let currentLastTs = lastTs
            let closed = false
            let pollCount = 0
            const MAX_POLLS = 300 // 5 minutes at 1s intervals then client reconnects

            const send = (data: object) => {
                if (closed) return
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
                } catch {
                    closed = true
                }
            }

            // Send initial heartbeat
            send({ type: 'connected', roomId, timestamp: Date.now() })

            const poll = async () => {
                if (closed || pollCount >= MAX_POLLS) {
                    if (!closed) {
                        send({ type: 'reconnect', timestamp: Date.now() })
                        controller.close()
                    }
                    return
                }

                pollCount++

                try {
                    // Get new events since last timestamp
                    const events = await redisGetNewEvents(roomId, currentLastTs)

                    for (const event of events) {
                        // Don't send user their own answer_submitted events
                        if (event.type === 'answer_submitted' && event.userId === userId) continue
                        send(event)
                        if (event.timestamp > currentLastTs) currentLastTs = event.timestamp
                    }

                    // Also send room state every 10 polls for resilience
                    if (pollCount % 10 === 0) {
                        const room = await redisGetRoom(roomId)
                        if (room) {
                            send({ type: 'room_state', room, timestamp: Date.now() })
                        }
                    }
                } catch (err) {
                    console.error('SSE poll error:', err)
                }

                // Poll every 800ms — fast enough for real-time feel
                if (!closed) {
                    setTimeout(poll, 800)
                }
            }

            // Start polling
            setTimeout(poll, 200)

            // Cleanup when client disconnects
            req.signal.addEventListener('abort', () => {
                closed = true
                try { controller.close() } catch { }
            })
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
    })
}