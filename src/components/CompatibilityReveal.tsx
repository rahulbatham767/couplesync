'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, RotateCcw, Sparkles, Check, User, X, Copy } from 'lucide-react'
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
  const [showShareModal, setShowShareModal] = useState(false)
  const [copyLabel, setCopyLabel] = useState<'Copy' | 'Copied!'>('Copy')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    const suffix = isSolo ? `\n\n(Solo mode vs AI ${displayPartner})` : ''
    const url = typeof window !== 'undefined' ? window.location.href : 'https://couplesync.app'
    return `💞 CoupleSync — ${score}% Compatible\n"${title}"\n${message}\n\n${lines}${suffix}\n\nTry it: ${url}`
  }

  const handleShare = async () => {
    const text = buildShareText()

    // Try native share on mobile
    const isMobile = /Mobi|Android/i.test(navigator.userAgent)
    if (navigator.share && isMobile) {
      try {
        await navigator.share({ title: `CoupleSync — ${score}% Compatible`, text, url: window.location.href })
        return
      } catch { /* user cancelled or unsupported — fall through */ }
    }

    // Try clipboard API silently
    try {
      await navigator.clipboard.writeText(text)
      setCopyLabel('Copied!')
      setShowShareModal(true)
      setTimeout(() => setCopyLabel('Copy'), 2000)
      return
    } catch { /* no permission — show modal with manual copy */ }

    // Always-works fallback: show the modal with textarea
    setShowShareModal(true)
  }

  const handleModalCopy = () => {
    const text = buildShareText()
    // Try clipboard API first
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopyLabel('Copied!')
        setTimeout(() => setCopyLabel('Copy'), 2000)
      }).catch(() => {
        // Select the textarea so user can Ctrl+C
        textareaRef.current?.select()
      })
    } else {
      // Legacy fallback — select text
      if (textareaRef.current) {
        textareaRef.current.select()
        try { document.execCommand('copy'); setCopyLabel('Copied!'); setTimeout(() => setCopyLabel('Copy'), 2000) } catch { }
      }
    }
  }

  return (
    <div className="relative flex items-center justify-center overflow-hidden py-8" style={{ minHeight: '100dvh' }}>
      <div className="fixed inset-0 pointer-events-none">
        {particles.map(p => <Particle key={p.id} color={p.color} />)}
      </div>
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 50%, ${color}40 0%, transparent 70%)` }} />

      {/* ── SHARE MODAL ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false) }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-md rounded-3xl overflow-hidden"
              style={{ background: '#0e0e12', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <h3 className="text-white font-semibold text-base">Share Your Result</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                    {copyLabel === 'Copied!' ? '✓ Copied to clipboard!' : 'Tap Copy, then paste anywhere'}
                  </p>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center touch-manipulation"
                  style={{ background: 'rgba(255,255,255,0.08)', WebkitTapHighlightColor: 'transparent' }}>
                  <X size={14} style={{ color: '#9ca3af' }} />
                </button>
              </div>

              {/* Share text preview */}
              <div className="px-5 py-4">
                <textarea
                  ref={textareaRef}
                  readOnly
                  value={buildShareText()}
                  rows={10}
                  className="w-full rounded-xl px-4 py-3 text-xs leading-relaxed resize-none focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#d1d5db',
                    fontFamily: 'monospace',
                  }}
                  onClick={() => textareaRef.current?.select()}
                />
              </div>

              {/* Actions */}
              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={handleModalCopy}
                  className="flex-1 py-3.5 rounded-2xl font-medium text-sm flex items-center gap-2 justify-center touch-manipulation transition-all"
                  style={{
                    background: copyLabel === 'Copied!'
                      ? 'rgba(74,222,128,0.15)'
                      : 'linear-gradient(135deg, #ff2d78, #a855f7)',
                    border: copyLabel === 'Copied!' ? '1px solid rgba(74,222,128,0.4)' : 'none',
                    color: copyLabel === 'Copied!' ? '#4ade80' : '#fff',
                    boxShadow: copyLabel === 'Copied!' ? 'none' : '0 0 20px rgba(255,45,120,0.3)',
                    WebkitTapHighlightColor: 'transparent',
                    minHeight: '52px',
                  }}>
                  {copyLabel === 'Copied!'
                    ? <><Check size={15} />Copied!</>
                    : <><Copy size={15} />Copy to Clipboard</>}
                </button>
              </div>

              {/* Bottom safe area */}
              <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN CARD ────────────────────────────────────────────────────────── */}
      <motion.div className="relative z-10 w-full max-w-lg mx-auto px-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <motion.div className="rounded-3xl p-6 sm:p-10 text-center"
          style={{
            background: 'rgba(5,5,8,0.82)', backdropFilter: 'blur(40px)',
            border: `1px solid ${color}40`, boxShadow: `0 0 60px ${color}15`,
          }}
          initial={{ scale: 0.85, y: 40 }} animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}>

          {isSolo && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-4 px-3 py-1 rounded-full text-xs inline-flex items-center gap-1.5"
              style={{ background: 'rgba(232,121,249,0.1)', border: '1px solid rgba(232,121,249,0.25)', color: '#e879f9' }}>
              <User size={10} />Solo mode · vs {displayPartner}
            </motion.div>
          )}

          <motion.div className="text-5xl sm:text-6xl mb-4"
            initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.3 }}>
            💑
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-1">
            <div className="font-bold leading-none" style={{
              fontFamily: 'var(--font-display)', color,
              textShadow: `0 0 30px ${color}, 0 0 60px ${color}40`,
              fontSize: 'clamp(4rem, 20vw, 7rem)',
            }}>
              <CountingNumber target={score} /><span style={{ fontSize: 'clamp(1.8rem, 8vw, 3.2rem)' }}>%</span>
            </div>
          </motion.div>

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
                    const uVal = myAnswer?.value ?? 0
                    const pVal = partnerAnswer?.value ?? 0
                    const diff = Math.abs(uVal - pVal)
                    const exact = userAnswers[i] === partnerAnswers[i]
                    const matchLabel = exact
                      ? { text: '✓ Perfect match', color: '#4ade80', bg: 'rgba(74,222,128,0.06)', border: 'rgba(74,222,128,0.2)' }
                      : diff === 1
                        ? { text: '~ Very close', color: '#a3e635', bg: 'rgba(163,230,53,0.04)', border: 'rgba(163,230,53,0.15)' }
                        : diff === 2
                          ? { text: '≈ Some overlap', color: '#facc15', bg: 'rgba(250,204,21,0.04)', border: 'rgba(250,204,21,0.12)' }
                          : { text: '✗ Different views', color: '#f87171', bg: 'rgba(248,113,113,0.04)', border: 'rgba(248,113,113,0.12)' }
                    return (
                      <div key={q.id} className="rounded-xl p-3" style={{
                        background: matchLabel.bg,
                        border: `1px solid ${matchLabel.border}`,
                      }}>
                        <p className="text-xs mb-1.5" style={{ color: '#6b7280' }}>{q.emoji} {q.text}</p>
                        <div className="grid grid-cols-2 gap-2 mb-1.5">
                          <div className="text-xs">
                            <span style={{ color: '#ff2d78' }} className="font-medium">You: </span>
                            <span className="text-gray-300">{myAnswer?.text || '—'}</span>
                          </div>
                          <div className="text-xs">
                            <span style={{ color: '#a855f7' }} className="font-medium">{displayPartner}: </span>
                            <span className="text-gray-300">{partnerAnswer?.text || '—'}</span>
                          </div>
                        </div>
                        <div className="text-xs font-medium" style={{ color: matchLabel.color }}>{matchLabel.text}</div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div className="flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
            <button onClick={onPlayAgain} className="btn-neon rounded-full text-sm flex-1 touch-manipulation"
              style={{ minHeight: '52px', WebkitTapHighlightColor: 'transparent' }}>
              <span className="flex items-center gap-2 justify-center"><RotateCcw size={14} />Play Again</span>
            </button>
            <button onClick={handleShare} className="btn-neon rounded-full text-sm flex-1 touch-manipulation"
              style={{ borderColor: '#a855f7', boxShadow: '0 0 15px rgba(168,85,247,0.3)', minHeight: '52px', WebkitTapHighlightColor: 'transparent' }}>
              <span className="flex items-center gap-2 justify-center">
                <Share2 size={14} />Share Result
              </span>
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}