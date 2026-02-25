'use client'

import { useState, useEffect, Suspense, lazy, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoom } from '@/hooks/useRoom'
import RoomLobby from '@/components/RoomLobby'
import QuizSection from '@/components/QuizSection'
import CompatibilityReveal from '@/components/CompatibilityReveal'
import ReelToggle, { ReelBars } from '@/components/ReelToggle'
import { getQuestionsForRoom } from '@/lib/questions'

// Lazy load 3D scene (not SSR-compatible)
const HeroScene = lazy(() => import('@/components/HeroScene'))

type AppState = 'landing' | 'lobby' | 'quiz' | 'result'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('landing')
  const [reelMode, setReelMode] = useState(false)

  const {
    room,
    userAnswers,
    partnerAnswers,
    partnerAnsweredCurrent,
    loading,
    error,
    compatibilityScore,
    createRoom,
    joinRoom,
    submitAnswer,
    leaveRoom,
  } = useRoom()


  // --- FIX: Generate the deterministic questions based on room code ---
  const questions = useMemo(() => {
    if (!room?.code) return []
    return getQuestionsForRoom(room.code)
  }, [room?.code])
  // ------------------------------------------------------------------


  // Transition: waiting room → quiz when partner joins
  useEffect(() => {
    if (room?.status === 'active' && appState === 'lobby') {
      setAppState('quiz')
    }
  }, [room?.status, appState])

  // Transition: quiz → result when completed
  useEffect(() => {
    if ((room?.status === 'completed' || compatibilityScore !== null) && appState === 'quiz') {
      setAppState('result')
    }
  }, [room?.status, compatibilityScore, appState])

  const handleCreateRoom = async () => {
    await createRoom()
    setAppState('lobby')
  }

  const handleJoinRoom = async (code: string) => {
    await joinRoom(code)
    setAppState('lobby')
  }

  const handlePlayAgain = () => {
    leaveRoom()
    setAppState('landing')
  }

  const isWaiting =
    room != null &&
    userAnswers[room.current_question] !== undefined &&
    partnerAnswers[room.current_question] === undefined

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#050508' }}>
      {/* 3D Background */}
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-40 h-40 rounded-full animate-pulse" style={{ background: 'radial-gradient(circle, rgba(255,45,120,0.3), transparent)' }} />
            </div>
          }
        >
          <HeroScene reelMode={reelMode} intensity={appState === 'result' ? 1.5 : 1} />
        </Suspense>
      </div>

      {/* Vignette */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 25%, #050508 90%)', zIndex: 1 }}
      />

      {/* Reel bars */}
      <AnimatePresence>
        {reelMode && <ReelBars enabled={reelMode} />}
      </AnimatePresence>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
        <motion.div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => {
            if (appState !== 'landing') {
              if (window.confirm('Leave current session?')) handlePlayAgain()
            }
          }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-xl" style={{ filter: 'drop-shadow(0 0 8px #ff2d78)' }}>💞</span>
          <span
            className="text-lg font-bold shimmer-text"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            CoupleSync
          </span>
        </motion.div>

        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          {room && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs text-gray-400"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              Room {room.code}
            </div>
          )}
          <ReelToggle enabled={reelMode} onToggle={() => setReelMode(v => !v)} />
        </motion.div>
      </nav>

      {/* Main content */}
      <div
        className="relative z-10 min-h-screen flex items-center justify-center"
        style={{ paddingTop: '88px', paddingBottom: '48px' }}
      >
        <AnimatePresence mode="wait">

          {appState === 'landing' && (
            <motion.div
              key="landing"
              className="text-center px-4 w-full max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <h1
                  className="font-black leading-none mb-4"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 'clamp(3.5rem, 12vw, 7rem)',
                  }}
                >
                  <span className="gradient-text">Are You</span>
                  <br />
                  <span className="text-white">Made For</span>
                  <br />
                  <span className="gradient-text">Each Other?</span>
                </h1>
              </motion.div>

              <motion.p
                className="text-gray-400 text-lg mb-10 max-w-md mx-auto"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                A real-time compatibility quiz. Answer together. Discover your connection.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <button onClick={() => setAppState('lobby')} className="btn-neon rounded-full text-base px-10 py-4">
                  <span>Begin Together</span>
                </button>
                <p className="text-sm text-gray-500">5 questions · Real-time sync</p>
              </motion.div>

              <motion.div
                className="grid grid-cols-3 gap-4 mt-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                {[
                  { icon: '⚡', label: 'Real-time Sync' },
                  { icon: '🔮', label: 'Cinematic Reveal' },
                  { icon: '📱', label: 'Reel Mode' },
                ].map((f) => (
                  <div key={f.label} className="glass rounded-xl p-4">
                    <div className="text-2xl mb-1">{f.icon}</div>
                    <div className="text-xs text-gray-400">{f.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {appState === 'lobby' && (
            <motion.div
              key="lobby"
              className="w-full"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="text-center mb-8 px-4">
                <h2
                  className="text-3xl text-white mb-2"
                  style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
                >
                  Connect with Your Partner
                </h2>
                <p className="text-gray-400 text-sm">Both of you need to be in the same room to start</p>
              </div>
              <RoomLobby
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                roomCode={room?.code}
                waiting={room?.status === 'waiting'}
                loading={loading}
                error={error}
                partnerJoined={room?.status === 'active'}
              />
            </motion.div>
          )}

          {appState === 'quiz' && room && (
            <motion.div
              key="quiz"
              className="w-full"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <QuizSection
                currentQuestion={room.current_question}
                questions={questions}
                userAnswers={userAnswers}
                partnerAnsweredCurrent={partnerAnsweredCurrent}
                partnerAnswers={partnerAnswers}
                onAnswer={submitAnswer}
                isWaiting={isWaiting}
              />
            </motion.div>
          )}

          {appState === 'result' && compatibilityScore !== null && (
            <motion.div
              key="result"
              className="w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <CompatibilityReveal
                score={compatibilityScore}
                userAnswers={userAnswers}
                partnerAnswers={partnerAnswers}
                onPlayAgain={handlePlayAgain}
                questions={questions}
                reelMode={reelMode}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
