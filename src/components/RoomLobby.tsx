'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ArrowRight, Copy, Check, Wifi, Zap } from 'lucide-react'
import { GameMode } from '@/hooks/useRoom'

interface LobbyProps {
  onCreateRoom: () => void
  onJoinRoom: (code: string) => void
  roomCode?: string
  waiting?: boolean
  loading?: boolean
  error?: string | null
  partnerJoined?: boolean
  gameMode?: GameMode
}

export default function RoomLobby({
  onCreateRoom, onJoinRoom, roomCode,
  waiting, loading, error, partnerJoined, gameMode,
}: LobbyProps) {
  const [view, setView] = useState<'select' | 'join'>('select')
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!roomCode) return
    navigator.clipboard.writeText(roomCode).catch(() => { })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isLive = gameMode === 'redis' || gameMode === 'supabase'

  // ── WAITING SCREEN ───────────────────────────────────────────────────────────
  if (roomCode) {
    console.log(roomCode);
    console.log(partnerJoined);

    return (
      <motion.div key="waiting"
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto px-4 text-center">
        <div className="rounded-3xl p-8"
          style={{ background: 'rgba(5,5,8,0.75)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,45,120,0.2)' }}>

          {/* Backend badge */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-5 px-4 py-1.5 rounded-full text-xs inline-flex items-center gap-2"
            style={{
              background: isLive ? 'rgba(74,222,128,0.1)' : 'rgba(168,85,247,0.1)',
              border: `1px solid ${isLive ? 'rgba(74,222,128,0.3)' : 'rgba(168,85,247,0.3)'}`,
              color: isLive ? '#4ade80' : '#c084fc',
            }}>
            <Zap size={10} />
            {isLive ? `${gameMode === 'redis' ? 'Redis' : 'Supabase'} · Real-time ready` : 'Demo mode · No backend needed'}
          </motion.div>

          <div className="text-4xl mb-3">🔗</div>
          <h2 className="text-2xl text-white mb-1" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
            Room Created
          </h2>
          <p className="text-gray-400 text-sm mb-6">Share this code with your partner</p>

          {/* Code */}
          <div className="relative mb-6">
            <motion.div
              className="py-6 rounded-2xl text-5xl font-bold tracking-[0.3em] cursor-pointer select-all"
              style={{
                fontFamily: 'var(--font-display)',
                color: '#ff2d78',
                textShadow: '0 0 25px #ff2d78, 0 0 50px rgba(255,45,120,0.4)',
                background: 'rgba(255,45,120,0.06)',
                border: '1px solid rgba(255,45,120,0.3)',
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
              onClick={handleCopy}>
              {roomCode}
            </motion.div>
            <button onClick={handleCopy}
              className="absolute top-3 right-3 p-2 rounded-lg transition-colors touch-manipulation"
              style={{ background: 'rgba(255,255,255,0.08)', WebkitTapHighlightColor: 'transparent' }}>
              {copied ? <Check size={14} style={{ color: '#4ade80' }} /> : <Copy size={14} style={{ color: '#9ca3af' }} />}
            </button>
          </div>

          {/* Status */}
          <AnimatePresence mode="wait">
            {partnerJoined ? (
              <motion.div key="joined" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 justify-center" style={{ color: '#4ade80' }}>
                <Wifi size={14} />
                <span className="text-sm font-medium">Partner connected! Starting...</span>
              </motion.div>
            ) : (
              <motion.div key="waiting" className="flex items-center gap-2 justify-center" style={{ color: '#9ca3af' }}>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="typing-dot" style={{ background: '#a855f7', animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                <span className="text-sm">Waiting for partner...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    )
  }

  // ── SELECT VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md mx-auto px-4">
      <AnimatePresence mode="wait">
        {view === 'select' && (
          <motion.div key="select"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}
            className="space-y-3">

            <motion.button onClick={onCreateRoom} disabled={loading}
              className="w-full rounded-2xl p-5 text-left group transition-all duration-300 touch-manipulation"
              style={{
                background: 'rgba(5,5,8,0.7)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,45,120,0.2)', WebkitTapHighlightColor: 'transparent',
                minHeight: '80px',
              }}
              whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,45,120,0.12)' }}>
                  {loading
                    ? <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: '#ff2d78', borderTopColor: 'transparent' }} />
                    : <Plus size={20} style={{ color: '#ff2d78' }} />}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-0.5">{loading ? 'Creating...' : 'Create a Room'}</h3>
                  <p className="text-xs" style={{ color: '#6b7280' }}>Generate a code to share</p>
                </div>
                <ArrowRight size={15} style={{ color: '#4b5563' }} />
              </div>
            </motion.button>

            <motion.button onClick={() => setView('join')}
              className="w-full rounded-2xl p-5 text-left touch-manipulation"
              style={{
                background: 'rgba(5,5,8,0.7)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(168,85,247,0.2)', WebkitTapHighlightColor: 'transparent',
                minHeight: '80px',
              }}
              whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(168,85,247,0.12)' }}>
                  <span className="text-lg">🔑</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-0.5">Join a Room</h3>
                  <p className="text-xs" style={{ color: '#6b7280' }}>Enter your partner's 6-digit code</p>
                </div>
                <ArrowRight size={15} style={{ color: '#4b5563' }} />
              </div>
            </motion.button>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-sm text-center pt-1" style={{ color: '#f87171' }}>
                {error}
              </motion.p>
            )}
          </motion.div>
        )}

        {view === 'join' && (
          <motion.div key="join"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.3 }}
            className="rounded-3xl p-7"
            style={{ background: 'rgba(5,5,8,0.75)', backdropFilter: 'blur(30px)', border: '1px solid rgba(168,85,247,0.2)' }}>

            <button onClick={() => { setView('select'); setJoinCode('') }}
              className="text-xs mb-5 flex items-center gap-1 touch-manipulation" style={{ color: '#6b7280' }}>
              ← Back
            </button>

            <h3 className="text-2xl text-white mb-1" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
              Enter Room Code
            </h3>
            <p className="text-sm mb-5" style={{ color: '#6b7280' }}>Ask your partner for their 6-character code</p>

            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABC123"
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              className="w-full rounded-xl px-5 py-4 text-center text-2xl tracking-widest font-mono focus:outline-none mb-4 touch-manipulation"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${joinCode.length === 6 ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.12)'}`,
                color: '#fff', fontSize: '1.5rem',
                WebkitTapHighlightColor: 'transparent',
              }}
              onKeyDown={e => { if (e.key === 'Enter' && joinCode.length === 6) onJoinRoom(joinCode) }}
            />

            {error && <p className="text-sm mb-3 text-center" style={{ color: '#f87171' }}>{error}</p>}

            <button
              onClick={() => onJoinRoom(joinCode)}
              disabled={joinCode.length !== 6 || loading}
              className="w-full py-4 rounded-xl font-medium text-sm uppercase tracking-wider transition-all touch-manipulation"
              style={{
                background: joinCode.length === 6 ? 'linear-gradient(135deg, #a855f7, #e879f9)' : 'rgba(255,255,255,0.06)',
                color: joinCode.length === 6 ? '#fff' : '#4b5563',
                border: '1px solid',
                borderColor: joinCode.length === 6 ? 'transparent' : 'rgba(255,255,255,0.08)',
                boxShadow: joinCode.length === 6 ? '0 0 20px rgba(168,85,247,0.4)' : 'none',
                cursor: joinCode.length !== 6 || loading ? 'not-allowed' : 'pointer',
                minHeight: '52px', WebkitTapHighlightColor: 'transparent',
              }}>
              {loading ? 'Joining...' : 'Join Room →'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
