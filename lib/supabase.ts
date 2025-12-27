import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export type Edition = {
  id: string
  name: string
  description?: string
  year?: number
  is_active: boolean
  current_display_category_id?: string | null
  voting_phase: number // 1 = Nominación, 2 = Final
  phase1_end_date?: string | null
  phase2_end_date?: string | null
  created_at: string
}

export type Participant = {
  id: string
  name: string
  description?: string
  image_url?: string
  created_at: string
}

export type Category = {
  id: string
  name: string
  description?: string
  order: number
  edition_id: string
  voting_phase: number // 1 = Nominación, 2 = Final
  category_type: 'participant_based' | 'text_based' | 'duo' // Tipo de categoría
  phase1_end_date?: string
  phase2_end_date?: string
  created_at: string
}

export type Nomination = {
  id: string
  participant_id: string
  category_id: string
  is_winner: boolean
  is_finalist: boolean
  duo_participant2_id?: string | null // Para categorías tipo "duo"
  created_at: string
}

export type Vote = {
  id: string
  nomination_id: string
  category_id: string
  voter_identifier: string
  voting_phase: number // 1 o 2
  created_at: string
}

// Extended types with joins
export type NominationWithParticipant = Nomination & {
  participant: Participant
  duo_participant2?: Participant | null // Para categorías tipo "duo"
}

export type NominationWithVotes = NominationWithParticipant & {
  vote_count: number
}

export type CategoryWithNominations = Category & {
  nominations: NominationWithParticipant[]
}

export type TextSubmission = {
  id: string
  category_id: string
  user_id: string
  submission_text: string
  created_at: string
}

export type Duo = {
  id: string
  participant1_id: string
  participant2_id: string
  duo_name?: string
  created_at: string
}

export type DuoNomination = {
  id: string
  duo_id: string
  category_id: string
  is_winner: boolean
  is_finalist: boolean
  created_at: string
}

export type DuoVote = {
  id: string
  duo_nomination_id: string
  category_id: string
  voter_identifier: string
  voting_phase: number
  created_at: string
}

// Extended duo types with joins
export type DuoWithParticipants = Duo & {
  participant1: Participant
  participant2: Participant
}

export type DuoNominationWithDetails = DuoNomination & {
  duo: DuoWithParticipants
}

export type DuoNominationWithVotes = DuoNominationWithDetails & {
  vote_count: number
}

// Legacy type for backwards compatibility
export type Nominee = {
  id: string
  name: string
  description?: string
  image_url?: string
  category_id: string
  is_winner: boolean
  created_at: string
}
