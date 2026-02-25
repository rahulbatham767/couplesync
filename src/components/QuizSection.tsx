'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, Heart } from 'lucide-react'
import { Question } from '@/lib/questions'

interface QuizProps {
  currentQuestion: number
  questions: Question[]
  userAnswers: Record<number, string>
  partnerAnsweredCurrent: boolean
  partnerAnswers: Record<number, string>
  onAnswer: (questionIndex: number, answer: string) => void
  isWaiting: boolean
}
export default function QuizSection({
  currentQuestion, questions, userAnswers,
  partnerAnsweredCurrent, partnerAnswers, onAnswer, isWaiting,
}: QuizProps) {
  const [selectedThisSession, setSelectedThisSession] = useState<string | null>(null)

  const safeIndex = !questions?.length
    ? 0
    : Math.min(Math.max(currentQuestion, 0), questions.length - 1)

  // Always call useEffect — no hooks after early returns
  useEffect(() => {
    if (!questions?.length) return
    setSelectedThisSession(userAnswers[safeIndex] || null)
  }, [safeIndex, userAnswers, questions])

  // Now safe to early-return
  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: '#ff2d78', borderTopColor: 'transparent' }} />
        <p className="text-gray-400 text-sm">Loading questions...</p>
      </div>
    )
  }

  const question = questions[safeIndex]
  const hasAnswered = userAnswers[safeIndex] !== undefined
  const progress = (safeIndex / questions.length) * 100

  if (currentQuestion >= questions.length || !question) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: '#ff2d78', borderTopColor: 'transparent' }} />
        <p className="text-gray-400 text-sm">Calculating compatibility...</p>
      </div>
    )
  }

  const handleSelect = (optionId: string) => {
    if (hasAnswered) return
    setSelectedThisSession(optionId)
    onAnswer(safeIndex, optionId)
  }
  return (
    <div className="w-full max-w-xl mx-auto px-4 pb-6">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Question {safeIndex + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <motion.div className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #ff2d78, #a855f7)' }}
            initial={{ width: '0%' }} animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={safeIndex}
          initial={{ opacity: 0, x: 60, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -60, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}>

          {/* Question card */}
          <div className="rounded-2xl p-5 sm:p-6 mb-3" style={{
            background: 'rgba(5,5,8,0.7)', backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div className="text-4xl sm:text-5xl mb-3">{question.emoji}</div>
            <h2 className="text-xl sm:text-2xl text-white leading-tight"
              style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
              {question.text}
            </h2>
          </div>

          {/* Partner answered pill */}
          <AnimatePresence>
            {partnerAnsweredCurrent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 mb-3 px-4 py-2 rounded-full w-fit mx-auto"
                style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}>
                <Heart size={11} style={{ color: '#ff2d78' }} fill="#ff2d78" className="animate-pulse" />
                <span className="text-xs" style={{ color: '#c084fc' }}>Partner has answered</span>
                <Heart size={11} style={{ color: '#ff2d78' }} fill="#ff2d78" className="animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Options */}
          <div className="grid grid-cols-1 gap-2.5">
            {question.options.map((option, i) => {
              const isSelected = selectedThisSession === option.id
              const isPartnerChoice = partnerAnswers[safeIndex] === option.id && hasAnswered

              return (
                <motion.button
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  disabled={hasAnswered}
                  className="relative w-full text-left px-4 sm:px-5 rounded-xl transition-all duration-200 touch-manipulation"
                  style={{
                    minHeight: '60px',
                    paddingTop: '14px',
                    paddingBottom: '14px',
                    background: isSelected ? 'rgba(255,45,120,0.12)' : isPartnerChoice ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isSelected ? 'rgba(255,45,120,0.6)' : isPartnerChoice ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: isSelected ? '0 0 15px rgba(255,45,120,0.2)' : 'none',
                    cursor: hasAnswered ? 'default' : 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileTap={!hasAnswered ? { scale: 0.97 } : undefined}>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                      style={{
                        borderColor: isSelected ? '#ff2d78' : 'rgba(255,255,255,0.25)',
                        background: isSelected ? '#ff2d78' : 'transparent',
                        color: isSelected ? '#fff' : 'rgba(255,255,255,0.4)',
                      }}>
                      {isSelected ? <CheckCircle2 size={13} /> : option.id.toUpperCase()}
                    </div>
                    <span className="text-sm leading-snug flex-1" style={{ color: isSelected ? '#fff' : '#d1d5db' }}>
                      {option.text}
                    </span>
                    {isPartnerChoice && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="text-xs flex-shrink-0" style={{ color: '#c084fc' }}>
                        💜
                      </motion.span>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Waiting */}
          {hasAnswered && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 text-center">
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {isWaiting ? (
                  <>
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="typing-dot" style={{ background: '#a855f7', animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                    <span className="text-sm text-gray-300">Waiting for partner...</span>
                  </>
                ) : (
                  <>
                    <Clock size={13} style={{ color: '#a855f7' }} />
                    <span className="text-sm text-gray-300">Moving to next question...</span>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}