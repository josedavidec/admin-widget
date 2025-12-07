export const STATUS_OPTIONS = ['Nuevo', 'Contactado', 'En seguimiento', 'Convertido', 'Descartado'] as const
export type LeadStatus = typeof STATUS_OPTIONS[number]

export type RawLead = {
  id?: unknown
  name?: unknown
  email?: unknown
  phone?: unknown
  company?: unknown
  services?: unknown
  tags?: unknown
  budget_range?: unknown
  budgetRange?: unknown
  message?: unknown
  created_at?: unknown
  createdAt?: unknown
  status?: unknown
  note?: unknown
  assigned_to?: unknown
  assignedTo?: unknown
  last_contact_at?: unknown
  lastContactAt?: unknown
}

export type RawTeamMember = {
  id?: unknown
  name?: unknown
  email?: unknown
  role?: unknown
  photoUrl?: unknown
  photo_url?: unknown
  isAdmin?: unknown
  is_admin?: unknown
  isSuperAdmin?: unknown
  is_super_admin?: unknown
  sectionSettings?: unknown
  section_settings?: unknown
}

export type TeamMember = {
  id: number
  name: string
  email: string | null
  role: string | null
  photoUrl: string | null
  isAdmin: boolean
  isSuperAdmin: boolean
  sectionSettings?: SectionSettings
}

export type SectionSettings = {
  leads: boolean
  team: boolean
  tasks: boolean
  brands: boolean
  blog: boolean
  emails?: boolean
  media?: boolean
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed'

export type Task = {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  assignedToId: number | null
  assignedToName: string | null
  assignedToPhotoUrl?: string | null
  brandId: number | null
  brandName: string | null
  brandColor: string | null
  dueDate: string | null
  startDate: string | null
  createdAt: string
}

export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'twitter' | 'facebook'

export type SocialMediaAccount = {
  platform: SocialPlatform
  username: string
  url?: string
}

export type Brand = {
  id: number
  name: string
  color: string
  package?: string
  contactInfo?: string
  createdAt: string
  socialAccounts?: SocialMediaAccount[]
}

export type SocialMediaMetric = {
  id: number
  brandId: number
  platform: SocialPlatform
  followers: number
  engagement: number // porcentaje
  reach: number
  impressions: number
  date: string
  period: 'daily' | 'weekly' | 'monthly'
}

export type SocialMetricsSummary = {
  platform: SocialPlatform
  totalFollowers: number
  avgEngagement: number
  totalReach: number
  totalImpressions: number
  lastUpdated: string
}

export type Lead = {
  id: number
  name: string
  email: string
  phone: string
  company: string
  services: string[]
  tags: string[]
  budget_range: string
  message: string
  created_at: string
  status: LeadStatus
  note: string
  assignedTo: string
  lastContactAt: string | null
}

export type StatusFilter = LeadStatus | 'Todos'
export type AssignedFilter = 'Todos' | 'Sin asignar' | string
export type ServiceFilter = 'Todos' | string
export type ViewMode = 'table' | 'board'

export const ATTENTION_THRESHOLD_DAYS = 5

export const STATUS_STYLES: Record<LeadStatus, string> = {
  Nuevo: 'bg-blue-50 text-blue-700 border-blue-200',
  Contactado: 'bg-purple-50 text-purple-700 border-purple-200',
  'En seguimiento': 'bg-amber-50 text-amber-700 border-amber-200',
  Convertido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Descartado: 'bg-gray-100 text-gray-600 border-gray-200',
}

export type BlogPost = {
  id: number
  slug: string
  title: string
  date: string
  image: string | null
  excerpt: string | null
  content: string | null
  description: string | null
  created_at?: string
  updated_at?: string
}
