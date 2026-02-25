import { createClient } from '@supabase/supabase-js'

// on platforms where build-time env vars are not injected (e.g. HF Docker Spaces).
const supabaseUrl = 'https://aqjktdjdljelybkbeuvs.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxamt0ZGpkbGplbHlia2JldXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzgzNzQsImV4cCI6MjA4NzYxNDM3NH0.ActxQb8x8GckPsPckzso-DCxOeZ2gCI2CIu3JTbE3s4'

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
