import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Application {
  id: string
  created_at: string
  first_name: string
  last_name: string
  phone: string
  email?: string
  sobriety_date?: string
  employment_status?: string
  housing_needed?: string
  message?: string
  status: 'pending' | 'approved' | 'rejected' | 'contacted'
  reviewed_at?: string
  reviewed_by?: string
  notes?: string
}

export interface Resident {
  id: string
  created_at: string
  first_name: string
  last_name: string
  phone: string
  email?: string
  sobriety_date?: string
  move_in_date?: string
  move_out_date?: string
  employment_status?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  status: 'active' | 'inactive' | 'moved_out'
  room_number?: string
  monthly_rent?: number
  deposit_amount?: number
  notes?: string
  application_id?: string
}

export interface Payment {
  id: string
  created_at: string
  resident_id: string
  amount: number
  type: 'rent' | 'deposit' | 'fee' | 'refund'
  due_date: string
  paid_date?: string
  status: 'pending' | 'paid' | 'overdue' | 'partial'
  payment_method?: 'cash' | 'check' | 'bank_transfer' | 'online'
  notes?: string
  resident?: Resident
}

export interface Incident {
  id: string
  created_at: string
  resident_id: string
  incident_type: string
  description: string
  severity: 'minor' | 'major' | 'severe'
  action_taken?: string
  staff_member?: string
  resolved: boolean
  resolution_notes?: string
  resident?: Resident
}