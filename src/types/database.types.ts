export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          avatar_url?: string | null
          created_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string
          created_at?: string
        }
      }
      room_members: {
        Row: {
          room_id: string
          user_id: string
          role: 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          room_id: string
          user_id: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          room_id?: string
          user_id?: string
          role?: 'admin' | 'member'
          joined_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          room_id: string
          created_by: string
          payer_id: string | null
          amount: number
          description: string
          type: 'shared' | 'personal'
          status: 'paid' | 'unpaid'
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          room_id: string
          created_by: string
          payer_id?: string | null
          amount: number
          description: string
          type?: 'shared' | 'personal'
          status?: 'paid' | 'unpaid'
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          room_id?: string
          created_by?: string
          payer_id?: string | null
          amount?: number
          description?: string
          type?: 'shared' | 'personal'
          status?: 'paid' | 'unpaid'
          created_at?: string
          deleted_at?: string | null
        }
      }
      expense_splits: {
        Row: {
          id: string
          expense_id: string
          user_id: string
          amount_owed: number
        }
        Insert: {
          id?: string
          expense_id: string
          user_id: string
          amount_owed: number
        }
        Update: {
          id?: string
          expense_id?: string
          user_id?: string
          amount_owed?: number
        }
      }
      settlements: {
        Row: {
          id: string
          room_id: string
          payer_id: string
          payee_id: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          payer_id: string
          payee_id: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          payer_id?: string
          payee_id?: string
          amount?: number
          created_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          room_id: string
          user_id: string
          action_type: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          action_type: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          action_type?: string
          metadata?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      room_role: 'admin' | 'member'
      expense_type: 'shared' | 'personal'
      expense_status: 'paid' | 'unpaid'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
