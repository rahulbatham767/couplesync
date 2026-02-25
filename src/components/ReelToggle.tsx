'use client'

import { motion } from 'framer-motion'
import { Film, Monitor } from 'lucide-react'

interface ReelToggleProps {
  enabled: boolean
  onToggle: () => void
}

export default function ReelToggle({ enabled, onToggle }: ReelToggleProps) {
  return (
    <motion.button
      onClick={onToggle}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 ${
        enabled
          ? 'bg-neon-pink/20 border border-neon-pink/50 text-neon-pink'
          : 'bg-white/5 border border-white/15 text-gray-400 hover:text-white hover:border-white/30'
      }`}
      whileTap={{ scale: 0.95 }}
    >
      {enabled ? (
        <>
          <Film size={12} className="animate-pulse" />
          <span>Reel Mode ON</span>
        </>
      ) : (
        <>
          <Monitor size={12} />
          <span>Reel Mode</span>
        </>
      )}
    </motion.button>
  )
}

export function ReelBars({ enabled }: { enabled: boolean }) {
  if (!enabled) return null
  
  return (
    <div className="reel-mode pointer-events-none">
      <motion.div
        className="reel-bar-top"
        initial={{ height: 0 }}
        animate={{ height: 'calc((100vh - (100vw * 16/9)) / 2)' }}
        exit={{ height: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
      <motion.div
        className="reel-bar-bottom"
        initial={{ height: 0 }}
        animate={{ height: 'calc((100vh - (100vw * 16/9)) / 2)' }}
        exit={{ height: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
    </div>
  )
}
