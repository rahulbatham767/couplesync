import questionsData from './question.json'

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






export const ALL_QUESTIONS: Question[] = (questionsData && (questionsData as Question[]).length > 0)
  ? (questionsData as Question[])
  : [];

const FALLBACK_QUESTIONS: Question[] = [

  {
    id: 0,
    text: "Your ideal Saturday morning together?",
    emoji: "🌅",
    options: [
      { id: 'a', text: "Still in bed, breakfast ordered in", value: 1 },
      { id: 'b', text: "Farmers market then brunch", value: 2 },
      { id: 'c', text: "Morning hike to catch sunrise", value: 3 },
      { id: 'd', text: "Each doing our own thing, then meeting up", value: 4 },
    ]
  },
  {
    id: 1,
    text: "Dream vacation style?",
    emoji: "✈️",
    options: [
      { id: 'a', text: "Luxury resort, total relaxation", value: 1 },
      { id: 'b', text: "Cultural immersion, hidden gems", value: 2 },
      { id: 'c', text: "Adventure sports, thrill-seeking", value: 3 },
      { id: 'd', text: "Road trip, spontaneous detours", value: 4 },
    ]
  },
  {
    id: 2,
    text: "How do you handle conflict?",
    emoji: "💬",
    options: [
      { id: 'a', text: "Talk it out immediately, no waiting", value: 1 },
      { id: 'b', text: "Need space first, then discuss calmly", value: 2 },
      { id: 'c', text: "Write it out, then share feelings", value: 3 },
      { id: 'd', text: "Distract, then revisit when calm", value: 4 },
    ]
  },
  {
    id: 3,
    text: "Love language that resonates most?",
    emoji: "💝",
    options: [
      { id: 'a', text: "Words of affirmation — tell me you love me", value: 1 },
      { id: 'b', text: "Quality time — present, phone away", value: 2 },
      { id: 'c', text: "Physical touch — hand-holding, cuddles", value: 3 },
      { id: 'd', text: "Acts of service — doing things without asking", value: 4 },
    ]
  },
  {
    id: 4,
    text: "Five years from now, you envision...",
    emoji: "🔮",
    options: [
      { id: 'a', text: "Cozy home, maybe a pet or two", value: 1 },
      { id: 'b', text: "Traveling the world together", value: 2 },
      { id: 'c', text: "Building something creative together", value: 3 },
      { id: 'd', text: "Growing a family, roots in a community", value: 4 },
    ]
  },]



export function getQuestionsForRoom(roomCode: string, count = 5): Question[] {
  console.log("All question are", ALL_QUESTIONS);

  const sourceArray = ALL_QUESTIONS.length > 0 ? ALL_QUESTIONS : FALLBACK_QUESTIONS;
  const seed = roomCode.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const shuffled = [...sourceArray]
  let s = seed
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

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