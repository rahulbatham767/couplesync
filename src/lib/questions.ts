import questionsData from './questions.json'

export interface Question {
  id: number
  text: string
  emoji: string
  options: {
    id: string
    text: string
    value: number
  }[]
}

export const ALL_QUESTIONS: Question[] = questionsData as Question[]

// Pick N random questions from the pool — seeded by room code so
// both players always get the same set
export function getQuestionsForRoom(roomCode: string, count = 5): Question[] {
  // Simple seeded shuffle using room code chars as seed
  const seed = roomCode.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const shuffled = [...ALL_QUESTIONS]

  // Fisher-Yates with deterministic seed
  let s = seed
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled.slice(0, count)
}

// Fallback: first 5 questions (used before room code is known)
export const QUIZ_QUESTIONS: Question[] = ALL_QUESTIONS.slice(0, 5)

export function calculateCompatibility(
  userAnswers: Record<number, string>,
  partnerAnswers: Record<number, string>,
  questions: Question[] = QUIZ_QUESTIONS
): number {
  let score = 0
  const maxScore = questions.length * 20

  questions.forEach((q, i) => {
    const uAns = userAnswers[i]
    const pAns = partnerAnswers[i]
    if (!uAns || !pAns) return

    if (uAns === pAns) {
      score += 20
    } else {
      const uVal = q.options.find(o => o.id === uAns)?.value ?? 0
      const pVal = q.options.find(o => o.id === pAns)?.value ?? 0
      const diff = Math.abs(uVal - pVal)
      if (diff === 1) score += 8
      else if (diff === 2) score += 4
      else score += 0
    }
  })

  return Math.round((score / maxScore) * 100)
}

export function getCompatibilityMessage(score: number): {
  title: string
  message: string
  color: string
} {
  if (score >= 85) return { title: "Soulmates", message: "Your connection transcends the ordinary. You're rare — cherish this.", color: "#ff2d78" }
  if (score >= 65) return { title: "Deeply Connected", message: "You complement each other beautifully. Your differences are your strength.", color: "#a855f7" }
  if (score >= 45) return { title: "Wonderfully Compatible", message: "Strong foundation with room to grow. Adventure awaits you both.", color: "#e879f9" }
  return { title: "Beautifully Complex", message: "Opposites attract for a reason. Your differences create beautiful tension.", color: "#60a5fa" }
}
