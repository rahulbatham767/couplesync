'use client'

import { useState, useEffect, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoom } from '@/hooks/useRoom'
import RoomLobby from '@/components/RoomLobby'
import QuizSection from '@/components/QuizSection'
import CompatibilityReveal from '@/components/CompatibilityReveal'
import ReelToggle, { ReelBars } from '@/components/ReelToggle'
import { Users, User, Zap } from 'lucide-react'

const HeroScene = lazy(() => import('@/components/HeroScene'))

type AppState = 'landing' | 'mode_select' | 'lobby' | 'quiz' | 'result'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('landing')
  const [reelMode, setReelMode] = useState(false)

  const {
    room, questions, userAnswers, partnerAnswers,
    partnerAnsweredCurrent, loading, error,
    compatibilityScore, gameMode, partnerName,
    isWaiting, createRoom, startSolo, joinRoom,
    submitAnswer, leaveRoom,
  } = useRoom()

  useEffect(() => {
    if (room) {
      if (room.status === 'waiting') {
        setAppState('lobby')
      } else if (room.status === 'active' && questions.length > 0) {
        setAppState('quiz')
      } else if (room.status === 'completed' || compatibilityScore !== null) {
        setAppState('result')
      }
    }
  }, [room?.status, room?.id, compatibilityScore])
  const handleCreateRoom = async () => { await createRoom(); setAppState('lobby') }
  const handleJoinRoom = async (code: string) => { await joinRoom(code) }
  const handleSolo = () => { startSolo(); setAppState('quiz') }
  const handlePlayAgain = () => { leaveRoom(); setAppState('landing') }

  // Mode badge color
  const modeBadge = gameMode === 'redis'
    ? { label: 'Redis · Live', color: '#4ade80' }
    : gameMode === 'supabase'
      ? { label: 'Supabase · Live', color: '#38bdf8' }
      : gameMode === 'solo'
        ? { label: `vs ${partnerName} · Solo`, color: '#e879f9' }
        : { label: 'Demo mode', color: '#a855f7' }

  return (
    <div className="relative overflow-hidden" style={{ background: '#050508', minHeight: '100dvh' }}>
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-40 h-40 rounded-full animate-pulse"
              style={{ background: 'radial-gradient(circle, rgba(255,45,120,0.2), transparent)' }} />
          </div>
        }>
          <HeroScene reelMode={reelMode} intensity={appState === 'result' ? 1.5 : 1} />
        </Suspense>
      </div>

      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 25%, #050508 90%)', zIndex: 1,
      }} />

      <AnimatePresence>{reelMode && <ReelBars enabled={reelMode} />}</AnimatePresence>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3"
        style={{ background: 'rgba(5,5,8,0.5)', backdropFilter: 'blur(20px)' }}>
        <motion.button
          className="flex items-center gap-2 touch-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          onClick={() => { if (appState !== 'landing' && window.confirm('Leave current session?')) handlePlayAgain() }}
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <span className="text-xl" style={{ filter: 'drop-shadow(0 0 8px #ff2d78)' }}>💞</span>
          <span className="text-base sm:text-lg font-bold shimmer-text" style={{ fontFamily: 'var(--font-display)' }}>
            CoupleSync
          </span>
        </motion.button>

        <motion.div className="flex items-center gap-2"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          {room && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: modeBadge.color }} />
              <span style={{ color: modeBadge.color }}>{modeBadge.label}</span>
              {room.code && gameMode !== 'solo' && (
                <span className="text-gray-500 ml-1">· {room.code}</span>
              )}
            </div>
          )}
          <ReelToggle enabled={reelMode} onToggle={() => setReelMode(v => !v)} />
        </motion.div>
      </nav>

      {/* Main */}
      <div className="relative z-10 flex items-center justify-center"
        style={{ minHeight: '100dvh', paddingTop: '64px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        <AnimatePresence mode="wait">

          {/* LANDING */}
          {appState === 'landing' && (
            <motion.div key="landing" className="text-center px-4 w-full max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.5 }}>
              <motion.h1 className="font-black leading-none mb-4"
                style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(2.8rem, 11vw, 7rem)' }}
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}>
                <span className="gradient-text">Are You</span><br />
                <span className="text-white">Made For</span><br />
                <span className="gradient-text">Each Other?</span>
              </motion.h1>

              <motion.p className="text-gray-400 text-base sm:text-lg mb-8 max-w-md mx-auto"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                A real-time compatibility quiz. Answer together. Discover your connection.
              </motion.p>

              <motion.div className="flex flex-col gap-3 max-w-xs mx-auto"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                {/* Play with partner */}
                <button onClick={() => setAppState('mode_select')}
                  className="btn-neon rounded-2xl touch-manipulation"
                  style={{ minHeight: '60px', WebkitTapHighlightColor: 'transparent' }}>
                  <span className="flex items-center gap-3 justify-center text-base font-medium">
                    <Users size={18} />
                    Play with Partner
                  </span>
                </button>

                {/* Solo demo */}
                <button onClick={handleSolo}
                  className="rounded-2xl touch-manipulation transition-all duration-300"
                  style={{
                    minHeight: '60px',
                    background: 'rgba(232,121,249,0.1)',
                    border: '1px solid rgba(232,121,249,0.3)',
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                  <span className="flex items-center gap-3 justify-center text-base font-medium" style={{ color: '#e879f9' }}>
                    <User size={18} />
                    Solo Demo
                    <span className="text-xs font-normal opacity-70">vs AI partner</span>
                  </span>
                </button>
              </motion.div>

              <motion.div className="grid grid-cols-3 gap-3 mt-10"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                {[
                  { icon: '⚡', label: 'Real-time', sub: 'Redis powered' },
                  { icon: '🔮', label: 'Cinematic', sub: 'Reveal screen' },
                  { icon: '🤖', label: 'Solo Mode', sub: 'AI partner' },
                ].map(f => (
                  <div key={f.label} className="glass rounded-xl p-3">
                    <div className="text-xl mb-0.5">{f.icon}</div>
                    <div className="text-xs text-white font-medium">{f.label}</div>
                    <div className="text-xs text-gray-500">{f.sub}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* MODE SELECT */}
          {(appState === 'mode_select' || appState === 'lobby') && (
            <motion.div key="mode_select" className="w-full"
              initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
              <div className="text-center mb-6 px-4">
                <button onClick={() => setAppState('landing')} className="text-xs text-gray-500 mb-4 flex items-center gap-1 mx-auto touch-manipulation">
                  ← Back
                </button>
                <h2 className="text-2xl sm:text-3xl text-white mb-2"
                  style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                  Connect with Your Partner
                </h2>
                <p className="text-gray-400 text-sm">Create a room or join one with a code</p>
              </div>
              <RoomLobby
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                roomCode={room?.code}
                waiting={room?.status === 'waiting'}
                loading={loading}
                error={error}
                partnerJoined={room?.status === 'active'}
                gameMode={gameMode}
              />
            </motion.div>
          )}

          {/* QUIZ */}
          {appState === 'quiz' && room && (
            <motion.div key="quiz" className="w-full"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}>
              <QuizSection
                currentQuestion={room.current_question}
                questions={questions}
                userAnswers={userAnswers}
                partnerAnsweredCurrent={partnerAnsweredCurrent}
                partnerAnswers={partnerAnswers}
                onAnswer={submitAnswer}
                isWaiting={isWaiting}
                partnerName={partnerName}
                isSolo={gameMode === 'solo'}
              />
            </motion.div>
          )}

          {/* RESULT */}
          {appState === 'result' && compatibilityScore !== null && (
            <motion.div key="result" className="w-full"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
              <CompatibilityReveal
                score={compatibilityScore}
                questions={questions}
                userAnswers={userAnswers}
                partnerAnswers={partnerAnswers}
                onPlayAgain={handlePlayAgain}
                partnerName={partnerName}
                isSolo={gameMode === 'solo'}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
