'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Sparkles, Check, Download, Share2 } from 'lucide-react'
import { getCompatibilityMessage, Question } from '@/lib/questions'
import { toPng } from 'html-to-image'

interface RevealProps {
  score: number
  questions: Question[]
  userAnswers: Record<number, string>
  partnerAnswers: Record<number, string>
  onPlayAgain: () => void
  reelMode: boolean
}

/**
 * Animated number component for the score reveal
 */
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
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setCurrent(target)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return <span>{current}</span>
}

/**
 * Floating background particle effect
 */
function Particle({ color }: { color: string }) {
  const [pos] = useState(() => ({
    left: `${Math.random() * 100}vw`,
    width: `${Math.random() * 6 + 2}px`,
    height: `${Math.random() * 6 + 2}px`,
    animationDuration: `${Math.random() * 4 + 3}s`,
    animationDelay: `${Math.random() * 2}s`,
  }))
  return (
    <div
      className="particle fixed rounded-full pointer-events-none opacity-40"
      style={{
        ...pos,
        top: '-10px',
        background: color,
        boxShadow: `0 0 10px ${color}`
      }}
    />
  )
}

export default function CompatibilityReveal({
  score,
  questions,
  userAnswers,
  partnerAnswers,
  onPlayAgain
}: RevealProps) {
  const { title, message, color } = getCompatibilityMessage(score)
  const [showAnswers, setShowAnswers] = useState(false)
  const [downloadState, setDownloadState] = useState<'idle' | 'generating' | 'success' | 'error'>('idle')

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    color: i % 3 === 0 ? '#ff2d78' : i % 3 === 1 ? '#a855f7' : '#e879f9',
  }))

  // The specific reference for the element we want to capture as an image
  const captureRef = useRef<HTMLDivElement>(null)

  const handleDownload = useCallback(async () => {
    if (!captureRef.current) return
    setDownloadState('generating')

    try {
      // 1. Generate PNG with High Pixel Ratio for Mobile Quality
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        backgroundColor: '#050508',
        pixelRatio: 3,
        style: {
          borderRadius: '2.5rem'
        }
      })

      // 2. Create the download link
      const link = document.createElement('a')
      link.download = `CoupleSync-${score}.png`
      link.href = dataUrl

      // 3. Append, click, and cleanup
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setDownloadState('success')
    } catch (err) {
      console.error('Download error:', err)
      setDownloadState('error')

      // SAFARI FALLBACK: If direct download fails, open in a new tab for long-press saving
      const dataUrl = await toPng(captureRef.current)
      const newWindow = window.open()
      if (newWindow) {
        newWindow.document.write(`
          <body style="margin:0; background:#050508; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; color:white;">
            <p>Long press image to save to gallery</p>
            <img src="${dataUrl}" style="width:90%; border-radius:20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);" />
            <button onclick="window.close()" style="margin-top:20px; background:white; color:black; border:none; padding:10px 20px; border-radius:10px; font-weight:bold;">Close</button>
          </body>
        `)
      }
    } finally {
      setTimeout(() => setDownloadState('idle'), 3000)
    }
  }, [score])

  return (
    <div className="relative flex items-center justify-center py-8 min-h-[100dvh] bg-[#050508] overflow-x-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {particles.map(p => <Particle key={p.id} color={p.color} />)}
      </div>

      <div
        className="absolute inset-0 opacity-20 pointer-events-none z-0"
        style={{ background: `radial-gradient(circle at 50% 50%, ${color}40 0%, transparent 70%)` }}
      />

      <div className="relative z-10 w-full max-w-lg mx-auto px-4 flex flex-col items-center">

        {/* --- CAPTURE CONTAINER: Only this part becomes an image --- */}
        <div
          ref={captureRef}
          className="w-full rounded-[2.5rem] p-[2px] shadow-2xl"
          style={{ background: `linear-gradient(180deg, ${color}80, transparent)` }}
        >
          <div
            className="rounded-[2.4rem] p-10 sm:p-14 text-center relative overflow-hidden h-full bg-[#050508]"
            style={{ border: `1px solid ${color}20` }}
          >
            {/* Inner Glow Decorative Element */}
            <div className="absolute top-[-20%] left-[-20%] w-64 h-64 opacity-10 rounded-full blur-[80px]" style={{ background: color }} />

            <motion.div
              className="text-7xl mb-6 relative z-10"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12 }}
            >
              💑
            </motion.div>

            <div
              className="relative z-10 font-bold leading-none mb-4"
              style={{
                color,
                textShadow: `0 0 50px ${color}80`,
                fontSize: 'clamp(5rem, 20vw, 8rem)',
                fontFamily: 'var(--font-display)'
              }}
            >
              <CountingNumber target={score} />%
            </div>

            <h2 className="relative z-10 font-bold mb-4 italic uppercase tracking-tighter" style={{ color, fontSize: '2rem' }}>
              {title}
            </h2>

            <p className="relative z-10 text-gray-400 text-sm leading-relaxed mb-10 px-4 uppercase tracking-[0.15em] opacity-90">
              {message}
            </p>

            <div className="relative z-10 pt-8 border-t border-white/5 opacity-20 text-[10px] tracking-[0.6em] text-white uppercase">
              CoupleSync.app
            </div>
          </div>
        </div>

        {/* --- ACTION AREA: Buttons are kept outside the captureRef --- */}
        <div className="w-full mt-10 space-y-4 px-2">

          <motion.button
            onClick={handleDownload}
            disabled={downloadState === 'generating'}
            whileTap={{ scale: 0.96 }}
            className="w-full py-5 bg-white text-black rounded-2xl font-black flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.2)] active:shadow-none transition-all"
          >
            {downloadState === 'generating' ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                SAVING...
              </span>
            ) : downloadState === 'success' ? (
              <><Check size={22} className="text-green-600" /> SAVED TO DEVICE</>
            ) : (
              <><Download size={22} /> DOWNLOAD IMAGE</>
            )}
          </motion.button>

          <div className="flex gap-3">
            <button
              onClick={onPlayAgain}
              className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors active:scale-95"
            >
              <RotateCcw size={18} /> PLAY AGAIN
            </button>

            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className="px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold flex items-center justify-center transition-colors active:scale-95"
            >
              <Sparkles size={18} className={showAnswers ? "text-purple-400" : "text-white"} />
            </button>
          </div>
        </div>

        {/* Expandable Breakdown (Excluded from Image) */}
        <AnimatePresence>
          {showAnswers && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-6 w-full px-2"
            >
              <div className="space-y-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center mb-4">Detailed Breakdown</p>
                {questions.map((q, i) => {
                  const matched = userAnswers[i] === partnerAnswers[i];
                  return (
                    <div key={i} className="p-4 bg-white/[0.03] rounded-2xl border border-white/[0.05] flex justify-between items-center group">
                      <div className="flex flex-col">
                        <span className="text-gray-500 text-[10px] uppercase mb-1">{q.emoji} Question {i + 1}</span>
                        <span className="text-gray-300 text-xs font-medium">{q.text}</span>
                      </div>
                      <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${matched ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {matched ? 'Match' : 'Miss'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}