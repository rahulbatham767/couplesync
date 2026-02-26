'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, RotateCcw, Sparkles, Check, User } from 'lucide-react'
import { getCompatibilityMessage, Question } from '@/lib/questions'

interface RevealProps {
  score: number
  questions: Question[]
  userAnswers: Record<number, string>
  partnerAnswers: Record<number, string>
  onPlayAgain: () => void
  partnerName?: string | null
  isSolo?: boolean
}

function CountingNumber({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    startTime.current = null
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.floor(eased * target))
      if (progress < 1) { rafRef.current = requestAnimationFrame(animate) } else { setCurrent(target) }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return <span>{current}</span>
}

function Particle({ color }: { color: string }) {
  const [pos] = useState(() => ({
    left: `${Math.random() * 100}vw`,
    width: `${Math.random() * 8 + 4}px`,
    height: `${Math.random() * 8 + 4}px`,
    animationDuration: `${Math.random() * 3 + 2}s`,
    animationDelay: `${Math.random() * 2}s`,
  }))
  return <div className="particle" style={{ ...pos, top: '-20px', background: color }} />
}

export default function CompatibilityReveal({
  score, questions, userAnswers, partnerAnswers,
  onPlayAgain, partnerName, isSolo,
}: RevealProps) {
  const { title, message, color } = getCompatibilityMessage(score)
  const [showAnswers, setShowAnswers] = useState(false)
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared'>('idle')

  const displayPartner = partnerName || (isSolo ? 'AI Partner' : 'Partner')

  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i, color: i % 3 === 0 ? '#ff2d78' : i % 3 === 1 ? '#a855f7' : '#e879f9',
  }))

  const buildShareText = () => {
    const lines = questions.map((q, i) => {
      const myAns = q.options.find(o => o.id === userAnswers[i])?.text || '—'
      const partnerAns = q.options.find(o => o.id === partnerAnswers[i])?.text || '—'
      const match = userAnswers[i] === partnerAnswers[i] ? '✓' : '✗'
      return `${match} ${q.emoji} ${q.text}\n   You: ${myAns}\n   ${displayPartner}: ${partnerAns}`
    }).join('\n\n')
    const suffix = isSolo ? `\n\n(Played in Solo mode vs AI partner ${displayPartner})` : ''
    return `💞 CoupleSync — ${score}% Compatible\n"${title}"\n${message}\n\n${lines}${suffix}\n\nTry it: ${typeof window !== 'undefined' ? window.location.href : ''}`
  }

  const handleShare = async () => {
    const text = buildShareText()
    const isMobile = /Mobi|Android/i.test(navigator.userAgent)
    if (navigator.share && isMobile) {
      try {
        await navigator.share({ title: `CoupleSync — ${score}% Compatible`, text, url: window.location.href })
        setShareState('shared')
        setTimeout(() => setShareState('idle'), 2500)
        return
      } catch { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(text)
      setShareState('copied')
      setTimeout(() => setShareState('idle'), 2500)
    } catch {
      window.prompt('Copy your results:', text)
    }
  }

  return (
    <div className="relative flex items-center justify-center overflow-hidden py-8" style={{ minHeight: '100dvh' }}>
      <div className="fixed inset-0 pointer-events-none">
        {particles.map(p => <Particle key={p.id} color={p.color} />)}
      </div>
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 50%, ${color}40 0%, transparent 70%)` }} />

      <motion.div className="relative z-10 w-full max-w-lg mx-auto px-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <motion.div className="rounded-3xl p-6 sm:p-10 text-center"
          style={{
            background: 'rgba(5,5,8,0.82)', backdropFilter: 'blur(40px)',
            border: `1px solid ${color}40`, boxShadow: `0 0 60px ${color}15`,
          }}
          initial={{ scale: 0.85, y: 40 }} animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}>

          {/* Solo badge */}
          {isSolo && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-4 px-3 py-1 rounded-full text-xs inline-flex items-center gap-1.5"
              style={{ background: 'rgba(232,121,249,0.1)', border: '1px solid rgba(232,121,249,0.25)', color: '#e879f9' }}>
              <User size={10} />
              Solo mode · vs {displayPartner}
            </motion.div>
          )}

          <motion.div className="text-5xl sm:text-6xl mb-4"
            initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.3 }}>
            💑
          </motion.div>

          {/* Score */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-1">
            <div className="font-bold leading-none" style={{
              fontFamily: 'var(--font-display)', color,
              textShadow: `0 0 30px ${color}, 0 0 60px ${color}40`,
              fontSize: 'clamp(4rem, 20vw, 7rem)',
            }}>
              <CountingNumber target={score} /><span style={{ fontSize: 'clamp(1.8rem, 8vw, 3.2rem)' }}>%</span>
            </div>
          </motion.div>

          {/* Bar */}
          <motion.div className="my-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            <div className="compatibility-bar">
              <motion.div className="compatibility-bar-fill"
                style={{ background: `linear-gradient(90deg, ${color}, #e879f9)`, boxShadow: `0 0 10px ${color}` }}
                initial={{ width: '0%' }} animate={{ width: `${score}%` }}
                transition={{ duration: 2, delay: 0.9, ease: 'easeOut' }} />
            </div>
          </motion.div>

          <motion.h2 className="font-bold mb-2"
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color, fontSize: 'clamp(1.6rem, 7vw, 2.4rem)' }}
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            {title}
          </motion.h2>

          <motion.p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-5"
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
            {message}
            {isSolo && <span className="block text-xs mt-1 opacity-60">Based on your answers vs {displayPartner}'s AI responses</span>}
          </motion.p>

          {/* Toggle answers */}
          <motion.button onClick={() => setShowAnswers(!showAnswers)}
            className="text-sm text-gray-400 mb-4 flex items-center gap-2 mx-auto touch-manipulation"
            style={{ minHeight: '44px', WebkitTapHighlightColor: 'transparent' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
            <Sparkles size={13} />{showAnswers ? 'Hide' : 'Show'} answer comparison
          </motion.button>

          <AnimatePresence>
            {showAnswers && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4 }} className="overflow-hidden mb-5">
                <div className="space-y-2 text-left">
                  {questions.map((q, i) => {
                    const myAnswer = q.options.find(o => o.id === userAnswers[i])
                    const partnerAnswer = q.options.find(o => o.id === partnerAnswers[i])
                    const matched = userAnswers[i] === partnerAnswers[i]
                    return (
                      <div key={q.id} className="rounded-xl p-3" style={{
                        background: matched ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${matched ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}`,
                      }}>
                        <p className="text-xs mb-1.5" style={{ color: '#6b7280' }}>{q.emoji} {q.text}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-xs">
                            <span style={{ color: '#ff2d78' }} className="font-medium">You: </span>
                            <span className="text-gray-300">{myAnswer?.text || 'N/A'}</span>
                          </div>
                          <div className="text-xs">
                            <span style={{ color: '#a855f7' }} className="font-medium">{displayPartner}: </span>
                            <span className="text-gray-300">{partnerAnswer?.text || 'N/A'}</span>
                          </div>
                        </div>
                        {matched && <div className="text-xs mt-1" style={{ color: '#4ade80' }}>✓ Match!</div>}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <motion.div className="flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
            <button onClick={onPlayAgain} className="btn-neon rounded-full text-sm flex-1 touch-manipulation"
              style={{ minHeight: '52px', WebkitTapHighlightColor: 'transparent' }}>
              <span className="flex items-center gap-2 justify-center"><RotateCcw size={14} />Play Again</span>
            </button>
            <button onClick={handleShare} className="btn-neon rounded-full text-sm flex-1 touch-manipulation"
              style={{ borderColor: '#a855f7', boxShadow: '0 0 15px rgba(168,85,247,0.3)', minHeight: '52px', WebkitTapHighlightColor: 'transparent' }}>
              <span className="flex items-center gap-2 justify-center">
                {shareState !== 'idle'
                  ? <><Check size={14} />{shareState === 'copied' ? 'Copied!' : 'Shared!'}</>
                  : <><Share2 size={14} />Share Result</>}
              </span>
            </button>
          </motion.div>

          <AnimatePresence>
            {shareState === 'copied' && (
              <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs mt-3" style={{ color: '#a855f7' }}>
                Results + all answers copied! Paste anywhere 💜
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  )
}
