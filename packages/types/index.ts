// ============================================================
// MOSAIC v1.0 — Shared TypeScript Types
// ============================================================

export type UserRole = 'collector' | 'enterprise_admin' | 'enterprise_member' | 'superadmin'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed'
export type TaskStatus = 'open' | 'assigned' | 'in_progress' | 'submitted' | 'completed' | 'expired' | 'cancelled'
export type StoreStatus = 'pending' | 'assigned' | 'submitted' | 'compliant' | 'non_compliant' | 'flagged'
export type SubmissionStatus = 'pending_review' | 'processing' | 'approved' | 'rejected' | 'flagged'
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url?: string
  industry: string
  plan: 'starter' | 'growth' | 'enterprise'
  created_at: string
}

export interface Profile {
  id: string
  role: UserRole
  full_name?: string
  avatar_url?: string
  organization_id?: string
  phone?: string
  location_city?: string
  total_earnings_cents: number
  tasks_completed: number
  rating: number
  is_active: boolean
}

export interface Store {
  id: string
  organization_id: string
  external_id?: string
  name: string
  address: string
  city: string
  country: string
  postcode?: string
  lat?: number
  lng?: number
  retailer?: string
}

export interface Campaign {
  id: string
  organization_id: string
  created_by: string
  name: string
  product_sku: string
  product_name: string
  planogram_url?: string
  instructions?: string
  sla_minutes: number
  price_per_task_cents: number
  collector_payout_cents: number
  status: CampaignStatus
  starts_at?: string
  ends_at?: string
  created_at: string
  // Aggregates (from views/joins)
  total_stores?: number
  compliant_stores?: number
  compliance_score?: number
}

export interface CampaignStore {
  id: string
  campaign_id: string
  store_id: string
  status: StoreStatus
  compliance_score?: number
  last_checked_at?: string
  store?: Store
}

export interface Task {
  id: string
  campaign_id: string
  store_id: string
  assigned_to?: string
  status: TaskStatus
  payout_cents: number
  assigned_at?: string
  expires_at?: string
  completed_at?: string
  store?: Store
  campaign?: Campaign
}

export interface Submission {
  id: string
  task_id: string
  collector_id: string
  campaign_id: string
  store_id: string
  photo_urls: string[]
  notes?: string
  lat?: number
  lng?: number
  status: SubmissionStatus
  submitted_at: string
}

export interface ComplianceResult {
  id: string
  submission_id: string
  campaign_store_id: string
  score: number
  is_compliant: boolean
  findings: {
    sku_present: boolean
    eye_level: boolean
    facing_count: number
    oos: boolean
    planogram_match_pct: number
    issues: string[]
  }
  ai_model: string
  processed_at: string
}

export interface Payout {
  id: string
  collector_id: string
  task_id: string
  amount_cents: number
  currency: string
  status: PayoutStatus
  paid_at?: string
  created_at: string
}

export interface DashboardStats {
  compliance_score: number
  compliance_delta: number
  stores_audited: number
  stores_total: number
  compliant_count: number
  non_compliant_count: number
  pending_count: number
  avg_task_time_minutes: number
}
