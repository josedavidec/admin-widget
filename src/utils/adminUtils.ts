import { type Lead, type LeadStatus, type RawLead, type RawTeamMember, STATUS_OPTIONS, type TeamMember, ATTENTION_THRESHOLD_DAYS, type SectionSettings } from '../types/admin'

export function normalizeLead(raw: RawLead): Lead {
  let services: string[] = []
  if (Array.isArray(raw.services)) {
    services = raw.services.map((service: unknown) => String(service ?? ''))
  } else if (typeof raw.services === 'string') {
    try {
      const parsed = JSON.parse(raw.services)
      if (Array.isArray(parsed)) {
        services = parsed.map((service: unknown) => String(service ?? ''))
      }
    } catch {
      services = [String(raw.services)]
    }
  }

  let tags: string[] = []
  if (Array.isArray(raw.tags)) {
    tags = raw.tags.map((tag: unknown) => String(tag ?? ''))
  } else if (typeof raw.tags === 'string') {
    try {
      const parsed = JSON.parse(raw.tags)
      if (Array.isArray(parsed)) {
        tags = parsed.map((tag: unknown) => String(tag ?? ''))
      }
    } catch {
      // Si no es JSON válido, asumimos que es un solo tag o vacío
      const trimmed = raw.tags.trim()
      if (trimmed) tags = [trimmed]
    }
  }

  const rawStatus = typeof raw.status === 'string' ? raw.status.trim() : ''
  const status = STATUS_OPTIONS.includes(rawStatus as LeadStatus) ? (rawStatus as LeadStatus) : 'Nuevo'

  return {
    id: Number(raw.id) || Date.now(),
    name: typeof raw.name === 'string' ? raw.name : '',
    email: typeof raw.email === 'string' ? raw.email : '',
    phone: typeof raw.phone === 'string' ? raw.phone : '',
    company: typeof raw.company === 'string' ? raw.company : '',
    services,
    tags,
    budget_range:
      typeof raw.budget_range === 'string'
        ? raw.budget_range
        : typeof raw.budgetRange === 'string'
          ? raw.budgetRange
          : '',
    message: typeof raw.message === 'string' ? raw.message : '',
    created_at:
      typeof raw.created_at === 'string'
        ? raw.created_at
        : typeof raw.createdAt === 'string'
          ? raw.createdAt
          : new Date().toISOString(),
    status,
    note: typeof raw.note === 'string' ? raw.note : '',
    assignedTo:
      typeof raw.assigned_to === 'string'
        ? raw.assigned_to
        : typeof raw.assignedTo === 'string'
          ? raw.assignedTo
          : '',
    lastContactAt:
      typeof raw.last_contact_at === 'string'
        ? raw.last_contact_at
        : typeof raw.lastContactAt === 'string'
          ? raw.lastContactAt
          : null,
  }
}

function normalizeSectionSettings(raw: unknown): SectionSettings {
  const defaults: SectionSettings = { leads: true, team: true, tasks: true, brands: true, blog: true, emails: true, media: true }
  if (!raw || typeof raw !== 'object') return defaults

  const source = raw as Partial<SectionSettings>

  return {
    leads: typeof source.leads === 'boolean' ? source.leads : defaults.leads,
    team: typeof source.team === 'boolean' ? source.team : defaults.team,
    tasks: typeof source.tasks === 'boolean' ? source.tasks : defaults.tasks,
    brands: typeof source.brands === 'boolean' ? source.brands : defaults.brands,
    blog: typeof source.blog === 'boolean' ? source.blog : defaults.blog,
    emails: typeof source.emails === 'boolean' ? source.emails : defaults.emails,
    media: typeof source.media === 'boolean' ? source.media : defaults.media,
  }
}

export function normalizeTeamMember(raw: RawTeamMember): TeamMember {
  const getBool = (val1: unknown, val2: unknown, defaultVal: boolean) => {
    if (typeof val1 === 'boolean') return val1
    if (val1 === 1) return true
    if (val1 === 0) return false
    
    if (typeof val2 === 'boolean') return val2
    if (val2 === 1) return true
    if (val2 === 0) return false
    
    return defaultVal
  }

  return {
    id: Number(raw.id) || Date.now(),
    name: typeof raw.name === 'string' ? raw.name : '',
    email: typeof raw.email === 'string' && raw.email.trim() ? raw.email : null,
    role: typeof raw.role === 'string' && raw.role.trim() ? raw.role : null,
    photoUrl: typeof raw.photoUrl === 'string' ? raw.photoUrl : typeof raw.photo_url === 'string' ? raw.photo_url : null,
    isAdmin: getBool(raw.isAdmin, raw.is_admin, false),
    isSuperAdmin: getBool(raw.isSuperAdmin, raw.is_super_admin, false),
    sectionSettings: normalizeSectionSettings((raw as { sectionSettings?: unknown; section_settings?: unknown }).sectionSettings ?? (raw as { section_settings?: unknown }).section_settings),
  }
}

export function formatDate(timestamp: string) {
  const date = new Date(timestamp)
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatDateUTC(dateString: string) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(date)
}

export function formatRelativeFromNow(timestamp: string) {
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return 'Fecha inválida'

  const diffMs = parsed.getTime() - Date.now()
  const units: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
    { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
    { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
    { unit: 'week', ms: 1000 * 60 * 60 * 24 * 7 },
    { unit: 'day', ms: 1000 * 60 * 60 * 24 },
    { unit: 'hour', ms: 1000 * 60 * 60 },
    { unit: 'minute', ms: 1000 * 60 },
  ]

  const formatter = new Intl.RelativeTimeFormat('es-CO', { numeric: 'auto' })

  for (const { unit, ms } of units) {
    const value = diffMs / ms
    if (Math.abs(value) >= 1) {
      return formatter.format(Math.round(value), unit)
    }
  }

  return formatter.format(Math.round(diffMs / 1000), 'second')
}

export function leadNeedsAttention(lead: Lead) {
  if (lead.status === 'Convertido' || lead.status === 'Descartado') return false

  const lastContact = lead.lastContactAt ? new Date(lead.lastContactAt) : null
  if (!lastContact) return true

  const diffMs = Date.now() - lastContact.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays > ATTENTION_THRESHOLD_DAYS
}

export function compareByUrgency(a: Lead, b: Lead) {
  const aNeeds = leadNeedsAttention(a)
  const bNeeds = leadNeedsAttention(b)
  if (aNeeds !== bNeeds) return Number(bNeeds) - Number(aNeeds)

  const aTime = a.lastContactAt ? new Date(a.lastContactAt).getTime() : 0
  const bTime = b.lastContactAt ? new Date(b.lastContactAt).getTime() : 0
  return aTime - bTime
}
