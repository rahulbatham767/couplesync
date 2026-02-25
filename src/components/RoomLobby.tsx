'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, ArrowRight, Copy, Check, Wifi } from 'lucide-react'

interface LobbyProps {
  onCreateRoom: () => void
  onJoinRoom: (code: string) => void
  roomCode?: string
  waiting?: boolean
  loading?: boolean
  error?: string | null
  partnerJoined?: boolean
}

export default function RoomLobby({
  onCreateRoom,
  onJoinRoom,
  roomCode,
  waiting,
  loading,
  error,
  partnerJoined,
}: LobbyProps) {
  const [joinCode, setJoinCode] = useState('')
  const [mode, setMode] = useState<'select' | 'join' | 'created'>('select')
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (waiting || roomCode) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto px-4 text-center"
      >
        <div className="glass-dark rounded-3xl p-8 border border-neon-pink/20">
          <div className="text-4xl mb-4">🔗</div>
          <h2
            className="text-2xl text-white mb-2"
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
          >
            Room Created
          </h2>
          <p className="text-gray-400 text-sm mb-6">Share this code with your partner</p>

          {/* Room code display */}
          <div className="relative mb-6">
            <div
              className="text-5xl font-bold tracking-[0.3em] py-6 rounded-2xl border border-neon-pink/30 bg-neon-pink/5"
              style={{ fontFamily: 'var(--font-display)', color: '#ff2d78', textShadow: '0 0 20px #ff2d78' }}
            >
              {roomCode}
            </div>
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-400" />}
            </button>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2">
            {partnerJoined ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 text-green-400"
              >
                <Wifi size={14} />
                <span className="text-sm">Partner connected! Starting...</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="flex gap-1">
                  <div className="typing-dot" style={{ background: '#a855f7' }} />
                  <div className="typing-dot" style={{ background: '#a855f7' }} />
                  <div className="typing-dot" style={{ background: '#a855f7' }} />
                </div>
                <span className="text-sm">Waiting for partner to join...</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {mode === 'select' && (
          <div className="space-y-4">
            <div className="text-center mb-8">
              <p className="text-gray-400 text-sm">Choose how to begin</p>
            </div>

            <motion.button
              onClick={() => {
                onCreateRoom()
                setMode('created')
              }}
              disabled={loading}
              className="w-full glass-dark rounded-2xl p-6 border border-neon-pink/20 hover:border-neon-pink/50 transition-all group text-left"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-neon-pink/15 flex items-center justify-center flex-shrink-0 group-hover:bg-neon-pink/25 transition-colors">
                  <Plus size={20} className="text-neon-pink" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Create a Room</h3>
                  <p className="text-gray-400 text-sm">Generate a code to share with your partner</p>
                </div>
                <ArrowRight size={16} className="text-gray-500 ml-auto self-center group-hover:text-neon-pink transition-colors" />
              </div>
            </motion.button>

            <motion.button
              onClick={() => setMode('join')}
              className="w-full glass-dark rounded-2xl p-6 border border-neon-purple/20 hover:border-neon-purple/50 transition-all group text-left"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/25 transition-colors">
                  <Users size={20} className="text-neon-purple" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">Join a Room</h3>
                  <p className="text-gray-400 text-sm">Enter your partner's room code</p>
                </div>
                <ArrowRight size={16} className="text-gray-500 ml-auto self-center group-hover:text-neon-purple transition-colors" />
              </div>
            </motion.button>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-sm text-center mt-4"
              >
                {error}
              </motion.p>
            )}
          </div>
        )}

        {mode === 'join' && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-dark rounded-3xl p-8 border border-neon-purple/20"
          >
            <button
              onClick={() => setMode('select')}
              className="text-xs text-gray-500 hover:text-white mb-6 flex items-center gap-1 transition-colors"
            >
              ← Back
            </button>
            <h3
              className="text-2xl text-white mb-2"
              style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
            >
              Enter Room Code
            </h3>
            <p className="text-gray-400 text-sm mb-6">Ask your partner for their 6-character code</p>
            
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-5 py-4 text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-neon-purple/50 mb-4 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && joinCode.length === 6) {
                  onJoinRoom(joinCode)
                }
              }}
            />

            {error && (
              <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
            )}

            <button
              onClick={() => onJoinRoom(joinCode)}
              disabled={joinCode.length !== 6 || loading}
              className="w-full btn-neon rounded-xl"
              style={{ borderColor: '#a855f7', boxShadow: '0 0 15px rgba(168,85,247,0.3)' }}
            >
              <span className="flex items-center gap-2 justify-center">
                {loading ? 'Joining...' : 'Join Room'}
                <ArrowRight size={14} />
              </span>
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
