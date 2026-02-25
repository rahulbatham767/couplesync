import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          code: string
          created_at: string
          user1_id: string | null
          user2_id: string | null
          status: 'waiting' | 'active' | 'completed'
          compatibility_score: number | null
          current_question: number
        }
        Insert: {
          id?: string
          code: string
          created_at?: string
          user1_id?: string | null
          user2_id?: string | null
          status?: 'waiting' | 'active' | 'completed'
          compatibility_score?: number | null
          current_question?: number
        }
        Update: {
          id?: string
          code?: string
          user1_id?: string | null
          user2_id?: string | null
          status?: 'waiting' | 'active' | 'completed'
          compatibility_score?: number | null
          current_question?: number
        }
      }
      responses: {
        Row: {
          id: string
          room_id: string
          user_id: string
          question_index: number
          answer: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          question_index: number
          answer: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          question_index?: number
          answer?: string
        }
      }
    }
  }
}
