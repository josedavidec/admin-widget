import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent, type ChangeEvent } from 'react'
import { type DragEndEvent } from '@dnd-kit/core'
import {
  type Lead,
  type TeamMember,
  type Task,
  type Brand,
  type BlogPost,
  type LeadStatus,
  type StatusFilter,
  type AssignedFilter,
  type ServiceFilter,
  type ViewMode,
  STATUS_OPTIONS,
} from '../types/admin'
import {
  normalizeLead,
  normalizeTeamMember,
  leadNeedsAttention,
  compareByUrgency,
  formatDate,
} from '../utils/adminUtils'

type EmailTemplate = {
  id?: number
  name: string
  subject?: string
  body?: string
  variables?: Record<string, unknown>
  json_schema?: unknown
  created_by?: number
  created_at?: string
  updated_at?: string
}

export function useAdminLogic() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])
  const [emailLoading, setEmailLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [membersLoading, setMembersLoading] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [brandsLoading, setBrandsLoading] = useState(false)
  const [blogLoading, setBlogLoading] = useState(false)
  const [teamMemberSaving, setTeamMemberSaving] = useState(false)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos')
  const [assignedFilter, setAssignedFilter] = useState<AssignedFilter>('Todos')
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('Todos')
  const [tagFilter, setTagFilter] = useState<string>('Todos')
  const [brandFilter, setBrandFilter] = useState<string>('Todos')
  const [showAttentionOnly, setShowAttentionOnly] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeLeadId, setActiveLeadId] = useState<number | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [viewMode, _setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('admin_leads_view_mode') : null
      return (saved as ViewMode) || 'board'
    } catch (err) {
      console.error('Failed to read admin_view_mode from localStorage:', err)
      return 'board'
    }
  })

  const setViewMode = (mode: ViewMode) => {
    _setViewMode(mode)
    try {
      if (typeof window !== 'undefined') localStorage.setItem('admin_leads_view_mode', mode)
    } catch (err) {
      console.debug('localStorage not available for admin_leads_view_mode', err)
    }
  }
  const [taskViewMode, _setTaskViewMode] = useState<'list' | 'board' | 'calendar'>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('admin_task_view_mode') : null
      return (saved as 'list' | 'board' | 'calendar') || 'list'
    } catch {
      return 'list'
    }
  })

  const setTaskViewMode = (mode: 'list' | 'board' | 'calendar') => {
    _setTaskViewMode(mode)
    try {
      if (typeof window !== 'undefined') localStorage.setItem('admin_task_view_mode', mode)
    } catch (err) {
      console.debug('localStorage not available for admin_task_view_mode', err)
    }
  }
  const [taskMonthFilter, setTaskMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7))
  const [teamMemberForm, setTeamMemberForm] = useState<{
    name: string
    email: string
    role: string
    isAdmin: boolean
    password?: string
    photo: File | null
  }>({
    name: '',
    email: '',
    role: '',
    isAdmin: false,
    password: '',
    photo: null
  })
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'team' | 'tasks' | 'brands' | 'social' | 'blog' | 'emails' | 'media'>('overview')

  // Prevent duplicate concurrent fetches (useful in dev where StrictMode can double-invoke effects)
  const inflight = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!currentUser) return

    // Define qué tabs tiene permiso de ver cada usuario
    // Super Admin: solo overview y team
    // Regular Admin: respeta section_settings de la BD
    const sectionSettings = currentUser.sectionSettings || { leads: true, team: true, tasks: true, brands: true, blog: true, emails: true, media: true }

    const permissions: Record<'overview' | 'leads' | 'team' | 'tasks' | 'brands' | 'blog' | 'social' | 'emails' | 'media', boolean> = {
      overview: true,
      leads: currentUser.isSuperAdmin ? false : Boolean(sectionSettings.leads),
      team: true, // Todos pueden ver team (equipo o administradores)
      tasks: currentUser.isSuperAdmin ? false : Boolean(sectionSettings.tasks),
      brands: currentUser.isSuperAdmin ? false : Boolean(sectionSettings.brands),
      blog: currentUser.isSuperAdmin ? false : Boolean(sectionSettings.blog),
      social: currentUser.isSuperAdmin ? false : Boolean(sectionSettings.brands), // Social depende de brands
      emails: currentUser.isSuperAdmin ? false : Boolean(sectionSettings.emails),
      media: currentUser.isSuperAdmin ? false : Boolean(sectionSettings.media),
    }

    // Si el tab actual no está permitido, cambiar al primero permitido
    if (!permissions[activeTab]) {
      const firstAllowed = (Object.keys(permissions) as Array<keyof typeof permissions>)
        .find(key => permissions[key])

      if (firstAllowed) {
        setActiveTab(firstAllowed)
      }
    }
  }, [activeTab, currentUser])



  const resetTeamMemberForm = () => {
    setTeamMemberForm({ 
      name: '', 
      email: '', 
      role: '', 
      isAdmin: false,
      password: '',
      photo: null 
    })
    setEditingMemberId(null)
  }

  const showNotification = useCallback((msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3000)
  }, [])

  const copyToClipboard = async (text: string) => {
    if (!text) {
      showNotification('No hay información para copiar')
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      showNotification('Copiado al portapapeles')
    } catch {
      showNotification('No se pudo copiar')
    }
  }

  const getEmails = (source: Lead[]) => source.map((lead) => lead.email).filter(Boolean).join(',')

  const sortTeamMembers = useCallback(
    (source: TeamMember[]) => [...source].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  )

  const fetchTeamMembers = useCallback(
    async (authToken?: string) => {
      // Defensive: ignore authToken if it's not a string (e.g. an Event passed by mistake)
      if (authToken && typeof authToken !== 'string') {
        authToken = undefined
      }
      // Prefer explicit authToken, then state token, then localStorage fallback
      let tokenToUse = authToken || token
      if (!tokenToUse && typeof window !== 'undefined') {
        tokenToUse = localStorage.getItem('auth_token') || null
        if (tokenToUse) {
          setToken(tokenToUse)
          setIsAuthenticated(true)
        }
      }
      if (!tokenToUse) return
      const key = 'team-members'
      if (inflight.current.has(key)) return
      inflight.current.add(key)
      setMembersLoading(true)
      try {
        const response = await fetch('/api/team-members', {
          headers: {
            'Authorization': `Bearer ${tokenToUse}`,
          },
        })

        if (!response.ok) {
          throw new Error('Respuesta inválida del servidor')
        }

        const data = await response.json()
        const parsed = (Array.isArray(data) ? data : [])
          .map(normalizeTeamMember)
          .filter((member) => member.name.trim().length > 0)

        setTeamMembers(sortTeamMembers(parsed))
      } catch (err) {
        console.error(err)
        showNotification('No se pudieron cargar los responsables')
      } finally {
        inflight.current.delete(key)
        setMembersLoading(false)
      }
    },
    [showNotification, sortTeamMembers, token],
  )

  const fetchLeads = useCallback(
    async (authToken?: string) => {
      const tokenToUse = authToken || token
      if (!tokenToUse) return

      const key = 'leads'
      if (inflight.current.has(key)) return
      inflight.current.add(key)
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/leads`, {
          headers: {
            'Authorization': `Bearer ${tokenToUse}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          const parsedLeads = (Array.isArray(data) ? data : []).map(normalizeLead)

          setLeads(parsedLeads)
          await fetchTeamMembers(tokenToUse)
        } else {
          setError('Error de autenticación')
          // Debug info: log token and response status to help diagnose unexpected 401s
          console.debug('[fetchLeads] tokenUsed:', tokenToUse, 'status:', response.status)
          if (response.status === 401) {
            // Do not forcibly remove token or log the user out here —
            // avoid kicking the user from the session on manual refresh.
            showNotification('Autenticación inválida. Si el problema persiste, vuelve a iniciar sesión.')
          }
        }
      } catch (err) {
        console.error(err)
        setError('Error al cargar los datos')
      } finally {
        inflight.current.delete(key)
        setLoading(false)
      }
    },
    [fetchTeamMembers, token, showNotification],
  )

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token')
    if (savedToken) {
      setToken(savedToken)
      setIsAuthenticated(true)
      // Initial fetch is now handled by the activeTab effect

            fetch(`/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        if (user) {
          setCurrentUser(normalizeTeamMember(user))
        } else {
           localStorage.removeItem('auth_token')
           setIsAuthenticated(false)
        }
      })
      .catch(() => {})
    }
  }, [])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
        const response = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setToken(data.token)
        const normalizedUser = normalizeTeamMember(data.user)
        setCurrentUser(normalizedUser)
        setIsAuthenticated(true)
        localStorage.setItem('auth_token', data.token)

        // Super Admin no necesita cargar datos
        if (!normalizedUser.isSuperAdmin) {
          await fetchLeads(data.token)
        }
      } else {
        let msg = 'Credenciales inválidas'
        try {
          const body = await response.json()
          if (body && body.message) msg = body.message
        } catch (e) {
          // ignore
        }
        setError(msg)
        setIsAuthenticated(false)
        showNotification(msg)
      }
    } catch (err) {
      console.error(err)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setIsAuthenticated(false)
    setToken(null)
    setCurrentUser(null)
    setPassword('')
    setLeads([])
    setTeamMembers([])
    setMembersLoading(false)
    setTeamMemberSaving(false)
    resetTeamMemberForm()
  }

  const handleStatusChange = (leadId: number, newStatus: LeadStatus) => {
    const targetLead = leads.find((lead) => lead.id === leadId)
    const previousStatus = targetLead?.status ?? 'Nuevo'
    const previousLastContact = targetLead?.lastContactAt ?? null
    const shouldUpdateLastContact = newStatus === 'Contactado' || newStatus === 'En seguimiento'
    const newLastContact = shouldUpdateLastContact ? new Date().toISOString() : undefined

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              status: newStatus,
              lastContactAt: newLastContact ?? lead.lastContactAt,
            }
          : lead,
      ),
    )

        fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(
        newLastContact
          ? { status: newStatus, lastContactAt: newLastContact }
          : { status: newStatus },
      ),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Respuesta inválida del servidor')
        }
        return response.json()
      })
      .then((updatedLead) => {
        if (updatedLead) {
          setLeads((prev) => prev.map((lead) => (lead.id === leadId ? normalizeLead(updatedLead) : lead)))
        }
        showNotification('Estado actualizado')
      })
      .catch((err) => {
        console.error(err)
        setLeads((prev) =>
          prev.map((lead) =>
            lead.id === leadId
              ? {
                  ...lead,
                  status: previousStatus,
                  lastContactAt: previousLastContact,
                }
              : lead,
          ),
        )
        showNotification('No se pudo guardar el estado')
      })
  }

  const handleAssignLead = (leadId: number, assignedToValue: string) => {
    const sanitized = assignedToValue.trim()
    const targetLead = leads.find((lead) => lead.id === leadId)
    const previousAssigned = targetLead?.assignedTo ?? ''

    if (sanitized === previousAssigned.trim()) {
      return
    }

    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, assignedTo: sanitized } : lead)),
    )

        fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ assignedTo: sanitized }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Respuesta inválida del servidor')
        }
        return response.json()
      })
      .then((updatedLead) => {
        if (updatedLead) {
          setLeads((prev) => prev.map((lead) => (lead.id === leadId ? normalizeLead(updatedLead) : lead)))
        }
        showNotification('Responsable actualizado')
      })
      .catch((err) => {
        console.error(err)
        setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, assignedTo: previousAssigned } : lead)))
        showNotification('No se pudo asignar el lead')
      })
  }

  const handleDeleteLead = (leadId: number) => {
    if (!token) {
      showNotification('Debes iniciar sesión nuevamente')
      return
    }

    const lead = leads.find((item) => item.id === leadId)
    if (!lead) {
      return
    }

    const confirmation = window.confirm(`¿Eliminar el lead "${lead.name || `#${lead.id}`}"? Esta acción no se puede deshacer.`)
    if (!confirmation) {
      return
    }

    const snapshot = [...leads]
    setLeads((prev) => prev.filter((item) => item.id !== leadId))

        fetch(`/api/leads/${leadId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Respuesta inválida del servidor')
        }
        return response.json()
      })
      .then(() => {
        showNotification('Lead eliminado')
      })
      .catch((err) => {
        console.error(err)
        setLeads(snapshot)
        showNotification('No se pudo eliminar el lead')
      })
  }

  const handleTeamMemberFieldChange = (field: 'name' | 'email' | 'role' | 'password') => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setTeamMemberForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleTeamMemberCheckboxChange = (field: 'isAdmin') => (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked
    setTeamMemberForm((prev) => ({ ...prev, [field]: checked }))
  }

  const handleTeamMemberPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setTeamMemberForm((prev) => ({ ...prev, photo: event.target.files![0] }))
    }
  }

  const handleTeamMemberSetPhotoFile = (file: File) => {
    setTeamMemberForm((prev) => ({ ...prev, photo: file }))
  }

  const handleEditTeamMember = (member: TeamMember) => {
    setEditingMemberId(member.id)
    setTeamMemberForm({
      name: member.name,
      email: member.email ?? '',
      role: member.role ?? '',
      isAdmin: member.isAdmin,
      password: '',
      photo: null,
    })
  }

  const handleTeamMemberSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (teamMemberSaving) return

    if (!token) {
      showNotification('Debes iniciar sesión nuevamente')
      return
    }

    const trimmedName = teamMemberForm.name.trim()
    const trimmedEmail = teamMemberForm.email.trim()
    const trimmedRole = teamMemberForm.role.trim()

    if (!trimmedName) {
      showNotification('El nombre del responsable es obligatorio')
      return
    }

        const isEditing = editingMemberId !== null
    const endpoint = isEditing ? `/api/team-members/${editingMemberId}` : `/api/team-members`
    const method = isEditing ? 'PATCH' : 'POST'

    const formData = new FormData()
    formData.append('name', trimmedName)
    formData.append('email', trimmedEmail)
    formData.append('role', trimmedRole)
    // Permisos simplificados: solo nombre, email, rol, is_admin
    formData.append('isAdmin', String(teamMemberForm.isAdmin))

    if (teamMemberForm.password) {
      formData.append('password', teamMemberForm.password)
    }

    if (teamMemberForm.photo) {
      formData.append('photo', teamMemberForm.photo)
    }

    setTeamMemberSaving(true)

    try {
        const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Respuesta inválida del servidor')
      }

      const savedMember = await response.json()
      if (!savedMember) {
        throw new Error('Respuesta vacía del servidor')
      }

      const normalized = normalizeTeamMember(savedMember)
      if (!normalized.name.trim()) {
        throw new Error('Datos inválidos del responsable')
      }

      setTeamMembers((prev) => {
        if (isEditing) {
          return sortTeamMembers(prev.map((member) => (member.id === normalized.id ? normalized : member)))
        }
        return sortTeamMembers([...prev, normalized])
      })

      if (currentUser && normalized.id === currentUser.id) {
        setCurrentUser(normalized)
      }

      resetTeamMemberForm()
      showNotification(isEditing ? 'Responsable actualizado' : 'Responsable agregado')
    } catch (err) {
      console.error(err)
      showNotification('No se pudo guardar el responsable')
    } finally {
      setTeamMemberSaving(false)
    }
  }

  const handleCancelTeamMemberEdit = () => {
    resetTeamMemberForm()
  }

  const handleDeleteTeamMember = async (memberId: number) => {
    if (!token) {
      showNotification('Debes iniciar sesión nuevamente')
      return
    }

    const member = teamMembers.find((m) => m.id === memberId)
    if (!member) return

    const confirmation = window.confirm(`¿Eliminar a "${member.name}" del equipo?`)
    if (!confirmation) return

    const snapshot = [...teamMembers]
    setTeamMembers((prev) => prev.filter((m) => m.id !== memberId))

        try {
        const response = await fetch(`/api/team-members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Error al eliminar')
      }
      showNotification('Miembro eliminado')
    } catch (err) {
      console.error(err)
      setTeamMembers(snapshot)
      showNotification('No se pudo eliminar el miembro')
    }
  }

  const handleMarkContact = (leadId: number) => {
    const targetLead = leads.find((lead) => lead.id === leadId)
    if (!targetLead) return
    if (!token) {
      showNotification('Debes iniciar sesión nuevamente')
      return
    }

    const previousStatus = targetLead.status
    const previousLastContact = targetLead.lastContactAt ?? null
    const nowIso = new Date().toISOString()
    const promoteToContactado = targetLead.status === 'Nuevo'

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              lastContactAt: nowIso,
              status: promoteToContactado ? 'Contactado' : lead.status,
            }
          : lead,
      ),
    )

        const payload: Record<string, unknown> = { lastContactAt: nowIso }
    if (promoteToContactado) {
      payload.status = 'Contactado'
    }

    fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Respuesta inválida del servidor')
        }
        return response.json()
      })
      .then((updatedLead) => {
        if (updatedLead) {
          setLeads((prev) => prev.map((lead) => (lead.id === leadId ? normalizeLead(updatedLead) : lead)))
        }
        showNotification('Seguimiento registrado')
      })
      .catch((err) => {
        console.error(err)
        setLeads((prev) =>
          prev.map((lead) =>
            lead.id === leadId
              ? {
                  ...lead,
                  status: previousStatus,
                  lastContactAt: previousLastContact,
                }
              : lead,
          ),
        )
        showNotification('No se pudo registrar el contacto')
      })
  }

  const handleAssignmentSelect = (leadId: number, value: string) => {
    if (value === '__custom__') {
      const custom = window.prompt('Nombre del responsable')
      if (custom === null) {
        return
      }
      handleAssignLead(leadId, custom)
      return
    }

    handleAssignLead(leadId, value)
  }

  const handleOpenNotes = (leadId: number) => {
    setActiveLeadId(leadId)
    const lead = leads.find((item) => item.id === leadId)
    setNoteDraft(lead?.note ?? '')
  }

  const handleSaveNote = () => {
    if (!activeLeadId) return

    const leadId = activeLeadId
    const previousNote = leads.find((lead) => lead.id === leadId)?.note ?? ''
    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, note: noteDraft } : lead)))

        fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ note: noteDraft }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Respuesta inválida del servidor')
        }
        return response.json()
      })
      .then((updatedLead) => {
        if (updatedLead) {
          setLeads((prev) => prev.map((lead) => (lead.id === leadId ? normalizeLead(updatedLead) : lead)))
        }
        showNotification('Nota guardada')
        setActiveLeadId(null)
        setNoteDraft('')
      })
      .catch((err) => {
        console.error(err)
        setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, note: previousNote } : lead)))
        setNoteDraft(previousNote)
        showNotification('No se pudo guardar la nota')
      })
  }

  const updateLeadTags = (leadId: number, newTags: string[], previousTags: string[]) => {
    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, tags: newTags } : lead)))

        fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ tags: newTags }),
    })
      .then((response) => {
        if (!response.ok) throw new Error('Error al actualizar tags')
        return response.json()
      })
      .then((updatedLead) => {
        if (updatedLead) {
          setLeads((prev) => prev.map((lead) => (lead.id === leadId ? normalizeLead(updatedLead) : lead)))
        }
      })
      .catch((err) => {
        console.error(err)
        setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, tags: previousTags } : lead)))
        showNotification('No se pudieron actualizar las etiquetas')
      })
  }

  const handleAddTag = (leadId: number, newTag: string) => {
    const tag = newTag.trim()
    if (!tag) return

    const targetLead = leads.find((lead) => lead.id === leadId)
    if (!targetLead) return
    if (targetLead.tags && targetLead.tags.includes(tag)) return

    const currentTags = targetLead.tags || []
    const newTags = [...currentTags, tag]
    updateLeadTags(leadId, newTags, currentTags)
  }

  const handleRemoveTag = (leadId: number, tagToRemove: string) => {
    const targetLead = leads.find((lead) => lead.id === leadId)
    if (!targetLead) return

    const currentTags = targetLead.tags || []
    const newTags = currentTags.filter((t) => t !== tagToRemove)
    updateLeadTags(leadId, newTags, currentTags)
  }

  const filteredLeads = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    return leads.filter((lead) => {
      const statusMatches = statusFilter === 'Todos' || lead.status === statusFilter
      if (!statusMatches) return false

      const assignedMatches =
        assignedFilter === 'Todos' ||
        (assignedFilter === 'Sin asignar' && !lead.assignedTo) ||
        lead.assignedTo?.trim().toLowerCase() === assignedFilter.trim().toLowerCase()

      if (!assignedMatches) return false

      const serviceMatches =
        serviceFilter === 'Todos' || lead.services.map((service) => service.toLowerCase()).includes(serviceFilter.toLowerCase())

      if (!serviceMatches) return false

      const tagMatches =
        tagFilter === 'Todos' || (lead.tags && lead.tags.includes(tagFilter))

      if (!tagMatches) return false

      if (showAttentionOnly && !leadNeedsAttention(lead)) return false

      if (!search) return true

      const haystack = [lead.name, lead.email, lead.phone, lead.company, lead.message, lead.assignedTo]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(search)
    })
  }, [leads, statusFilter, assignedFilter, serviceFilter, tagFilter, searchTerm, showAttentionOnly])

  const filteredTasks = useMemo(() => {
    if (!taskMonthFilter) return tasks
    return tasks.filter(task => {
      // Check if task has a due date or start date in the selected month
      const taskDate = task.dueDate || task.startDate
      if (!taskDate) return false
      return taskDate.startsWith(taskMonthFilter)
    })
  }, [tasks, taskMonthFilter])

  const handleExportCSV = () => {
    const header = [
      'Fecha',
      'Nombre',
      'Email',
      'Teléfono',
      'Empresa',
      'Servicios',
      'Presupuesto',
      'Asignado',
      'Último contacto',
      'Estado',
      'Nota',
      'Mensaje',
    ]
    const rows = filteredLeads.map((lead) => {
      const values = [
        formatDate(lead.created_at),
        lead.name,
        lead.email,
        lead.phone,
        lead.company,
        lead.services.join(' | '),
        lead.budget_range,
        lead.assignedTo,
        lead.lastContactAt ? formatDate(lead.lastContactAt) : '',
        lead.status,
        lead.note,
        lead.message,
      ]

      return values
        .map((value) => {
          const safe = value ? value.toString() : ''
          const needsEscape = safe.includes(',') || safe.includes('"') || safe.includes('\n')
          if (needsEscape) {
            return `"${safe.replace(/"/g, '""')}"`
          }
          return safe
        })
        .join(',')
    })

    const csvContent = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `leads-${new Date().toISOString()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showNotification('CSV descargado')
  }

  const metrics = useMemo(() => {
    const totalsByStatus = STATUS_OPTIONS.reduce<Record<LeadStatus, number>>((acc, status) => {
      acc[status] = 0
      return acc
    }, {} as Record<LeadStatus, number>)

    leads.forEach((lead) => {
      totalsByStatus[lead.status] = (totalsByStatus[lead.status] ?? 0) + 1
    })

    const totalLeads = leads.length
    const converted = totalsByStatus.Convertido ?? 0
    const conversionRate = totalLeads === 0 ? 0 : Math.round((converted / totalLeads) * 1000) / 10

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const leadsThisWeek = leads.filter((lead) => new Date(lead.created_at) >= weekAgo).length
    const contactsThisWeek = leads.filter((lead) => lead.lastContactAt && new Date(lead.lastContactAt) >= weekAgo).length

    const unassigned = leads.filter((lead) => !lead.assignedTo?.trim()).length
    const needingFollowUp = leads.filter((lead) => leadNeedsAttention(lead)).length

    const serviceCount = leads.reduce<Record<string, number>>((acc, lead) => {
      lead.services.forEach((service) => {
        const key = service.trim()
        if (!key) return
        acc[key] = (acc[key] ?? 0) + 1
      })
      return acc
    }, {})

    return {
      totalLeads,
      converted,
      conversionRate,
      leadsThisWeek,
      contactsThisWeek,
      unassigned,
      needingFollowUp,
      totalsByStatus,
      serviceCount,
    }
  }, [leads])

  const leadsByStatus = useMemo(() => {
    return STATUS_OPTIONS.reduce<Record<LeadStatus, Lead[]>>((acc, status) => {
      acc[status] = filteredLeads.filter((lead) => lead.status === status)
      return acc
    }, {} as Record<LeadStatus, Lead[]>)
  }, [filteredLeads])

  const attentionLeads = useMemo(() => {
    return leads.filter((lead) => leadNeedsAttention(lead)).sort(compareByUrgency).slice(0, 6)
  }, [leads])

  const assignmentStats = useMemo(() => {
    const totals = new Map<string, number>()
    leads.forEach((lead) => {
      const key = lead.assignedTo?.trim() || 'Sin asignar'
      totals.set(key, (totals.get(key) ?? 0) + 1)
    })
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
  }, [leads])

  const recentLeads = useMemo(() => {
    return [...leads]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
  }, [leads])

  const assignmentOptions = useMemo(() => {
    const options = new Set<string>()
    teamMembers.forEach((member) => {
      const value = member.name.trim()
      if (value) options.add(value)
    })
    // Keep existing assignments even if permission removed, to avoid UI bugs
    leads.forEach((lead) => {
      const value = lead.assignedTo?.trim()
      if (value) options.add(value)
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [leads, teamMembers])

  const taskAssignmentOptions = useMemo(() => {
    return teamMembers
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [teamMembers])

  const fetchBrands = useCallback(async (authToken?: string) => {
    const tokenToUse = authToken || token
    if (!tokenToUse) return
    const key = 'brands'
    if (inflight.current.has(key)) return
    inflight.current.add(key)
    setBrandsLoading(true)
    try {
      const response = await fetch(`/api/brands`, {
        headers: { 'Authorization': `Bearer ${tokenToUse}` },
      })
      if (!response.ok) throw new Error('Error al cargar marcas')
      const data = await response.json()
      setBrands(data)
    } catch (err) {
      console.error(err)
      showNotification('No se pudieron cargar las marcas')
    } finally {
      inflight.current.delete(key)
      setBrandsLoading(false)
    }
  }, [showNotification, token])

  const fetchBlogPosts = useCallback(async () => {
    const key = 'blog'
    if (inflight.current.has(key)) return
    inflight.current.add(key)
    setBlogLoading(true)
    try {
      const response = await fetch(`/api/blog`)
      if (!response.ok) throw new Error('Error al cargar blog')
      const data = await response.json()
      setBlogPosts(data)
    } catch (err) {
      console.error(err)
      showNotification('No se pudieron cargar las entradas del blog')
    } finally {
      inflight.current.delete(key)
      setBlogLoading(false)
    }
  }, [showNotification])

  const fetchEmailTemplates = useCallback(async () => {
    const key = 'email_templates'
    if (inflight.current.has(key)) return
    inflight.current.add(key)
    setEmailLoading(true)
    try {
      const response = await fetch(`/api/email-templates`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      })
      if (!response.ok) throw new Error('Error al cargar plantillas')
      const data = await response.json()
      setEmailTemplates(data)
    } catch (err) {
      console.error(err)
      showNotification('No se pudieron cargar las plantillas de correo')
    } finally {
      inflight.current.delete(key)
      setEmailLoading(false)
    }
  }, [showNotification, token])

  useEffect(() => {
    if (isAuthenticated) {
      void fetchEmailTemplates()
    }
  }, [isAuthenticated, fetchEmailTemplates])

  const createEmailTemplate = async (payload: Partial<EmailTemplate>) => {
    if (!token) return null
    try {
      // Ensure minimal shape for server
      const bodyPayload: Partial<EmailTemplate> = { ...payload }
      if (!bodyPayload.name) bodyPayload.name = 'Sin nombre'
      const response = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(bodyPayload),
      })
      if (!response.ok) throw new Error('Error al crear plantilla')
      const data = await response.json()
      setEmailTemplates(prev => [data, ...prev])
      showNotification('Plantilla creada')
      return data
    } catch (err) {
      console.error(err)
      showNotification('No se pudo crear la plantilla')
      return null
    }
  }

  const updateEmailTemplate = async (id: number, payload: Partial<EmailTemplate>) => {
    if (!token) return false
    try {
      const response = await fetch(`/api/email-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('Error al actualizar plantilla')
      const data = await response.json()
      setEmailTemplates(prev => prev.map(t => t.id === id ? data : t))
      showNotification('Plantilla actualizada')
      return true
    } catch (err) {
      console.error(err)
      showNotification('No se pudo actualizar la plantilla')
      return false
    }
  }

  const deleteEmailTemplate = async (id: number) => {
    if (!token) return false
    try {
      const response = await fetch(`/api/email-templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Error al eliminar plantilla')
      setEmailTemplates(prev => prev.filter(t => t.id !== id))
      showNotification('Plantilla eliminada')
      return true
    } catch (err) {
      console.error(err)
      showNotification('No se pudo eliminar la plantilla')
      return false
    }
  }

  const sendEmail = async (payload: { to: string; templateId?: number; subject?: string; body?: string; variables?: Record<string, unknown> }) => {
    if (!token) return false
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        showNotification(data.message || 'Error al enviar correo')
        return false
      }
      showNotification('Correo enviado')
      return true
    } catch (err) {
      console.error(err)
      showNotification('Error de conexión al enviar correo')
      return false
    }
  }

  const scheduleEmail = async (payload: { to: string; templateId?: number; subject?: string; body?: string; variables?: Record<string, unknown>; sendAt: string }) => {
    if (!token) return false
    try {
      const response = await fetch('/api/email/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        showNotification(data.message || 'Error al programar correo')
        return false
      }
      showNotification('Correo programado')
      return true
    } catch (err) {
      console.error(err)
      showNotification('Error de conexión al programar correo')
      return false
    }
  }

  const handleCreateBrand = async (name: string, color: string, pkg: string, contactInfo: string, socialAccounts?: Array<{ platform: string; username: string; url?: string }>) => {
    if (!token) return

    try {
      const response = await fetch(`/api/brands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          name, 
          color, 
          package: pkg, 
          contactInfo,
          socialAccounts: socialAccounts || []
        }),
      })
      if (!response.ok) throw new Error('Error al crear marca')
      const newBrand = await response.json()
      setBrands(prev => [...prev, newBrand].sort((a, b) => a.name.localeCompare(b.name)))
      showNotification('Marca creada')
    } catch (err) {
      console.error(err)
      showNotification('No se pudo crear la marca')
    }
  }

  const handleUpdateBrand = async (id: number, name: string, color: string, pkg: string, contactInfo: string, socialAccounts?: Array<{ platform: string; username: string; url?: string }>) => {
    if (!token) return
    try {
      const response = await fetch(`/api/brands/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, color, package: pkg, contactInfo, socialAccounts: socialAccounts || [] }),
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.message || 'Error al actualizar marca')
      }
      const updated = await response.json()
      setBrands(prev => prev.map(b => b.id === id ? updated : b).sort((a, b) => a.name.localeCompare(b.name)))
      showNotification('Marca actualizada')
    } catch (err) {
      console.error(err)
      showNotification('No se pudo actualizar la marca')
    }
  }

  const handleDeleteBrand = async (brandId: number) => {
    if (!token) return

    if (!window.confirm('¿Eliminar esta marca? Las tareas asociadas perderán la marca.')) return

    setBrands(prev => prev.filter(b => b.id !== brandId))

        try {
      await fetch(`/api/brands/${brandId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      showNotification('Marca eliminada')
    } catch (err) {
      console.error(err)
      showNotification('Error al eliminar marca')
    }
  }

  const handleCreateBlogPost = async (post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>) => {
    if (!token) return false

        try {
        const response = await fetch(`/api/blog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(post),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al crear entrada')
      }

      const newPost = await response.json()
      setBlogPosts(prev => [newPost, ...prev])
      showNotification('Entrada creada exitosamente')
      return true
    } catch (err) {
      console.error(err)
      showNotification(err instanceof Error ? err.message : 'Error al crear entrada')
      return false
    }
  }

  const handleUpdateBlogPost = async (id: number, post: Partial<BlogPost>) => {
    if (!token) return false

        try {
        const response = await fetch(`/api/blog/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(post),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al actualizar entrada')
      }

      const updatedPost = await response.json()
      setBlogPosts(prev => prev.map(p => p.id === id ? updatedPost : p))
      showNotification('Entrada actualizada exitosamente')
      return true
    } catch (err) {
      console.error(err)
      showNotification(err instanceof Error ? err.message : 'Error al actualizar entrada')
      return false
    }
  }

  const handleDeleteBlogPost = async (id: number) => {
    if (!token) return

    if (!window.confirm('¿Estás seguro de que deseas eliminar esta entrada?')) return

        try {
        const response = await fetch(`/api/blog/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al eliminar entrada')
      }

      setBlogPosts(prev => prev.filter(p => p.id !== id))
      showNotification('Entrada eliminada exitosamente')
    } catch (err) {
      console.error(err)
      showNotification(err instanceof Error ? err.message : 'Error al eliminar entrada')
    }
  }

  const fetchTasks = useCallback(async (authToken?: string) => {
    const tokenToUse = authToken || token
    if (!tokenToUse) return
    const key = 'tasks'
    if (inflight.current.has(key)) return
    inflight.current.add(key)
    setTasksLoading(true)
    try {
      const response = await fetch(`/api/tasks`, {
        headers: { 'Authorization': `Bearer ${tokenToUse}` },
      })
      if (!response.ok) throw new Error('Error al cargar tareas')
      const data = await response.json()
      setTasks(data)
    } catch (err) {
      console.error(err)
      showNotification('No se pudieron cargar las tareas')
    } finally {
      inflight.current.delete(key)
      setTasksLoading(false)
    }
  }, [showNotification, token])


  // Fetch data based on active tab or if overview is active
  useEffect(() => {
    if (!token) return

    if (activeTab === 'overview') {
      // Fetch all data needed for overview
      void fetchLeads(token)
      void fetchTasks(token)
      void fetchBrands(token)
      void fetchTeamMembers(token)
    } else if (activeTab === 'leads') {
      void fetchLeads(token)
    } else if (activeTab === 'tasks') {
      void fetchTasks(token)
      void fetchBrands(token)
      void fetchTeamMembers(token)
    } else if (activeTab === 'team') {
      void fetchTeamMembers(token)
    } else if (activeTab === 'brands') {
      void fetchBrands(token)
    } else if (activeTab === 'blog') {
      void fetchBlogPosts()
    }
  }, [activeTab, token, fetchLeads, fetchTasks, fetchBrands, fetchTeamMembers, fetchBlogPosts])

  // Server-Sent Events subscription for live task updates
  useEffect(() => {
    if (!token) return
    let es: EventSource | null = null
    try {
      // Pass token as query param since EventSource doesn't support custom headers
      es = new EventSource(`/api/tasks/stream?token=${token}`)
    } catch (err) {
      console.error('Could not open EventSource', err)
      return
    }

    const onTasksUpdate = (e: MessageEvent) => {
      try {
        // data is JSON payload; we simply re-fetch tasks for consistency
        void fetchTasks(token)
      } catch (err) {
        console.error('Error handling tasks update', err)
      }
    }

    es.addEventListener('tasks:update', onTasksUpdate)
    es.addEventListener('message', onTasksUpdate) // fallback
    es.addEventListener('error', (ev) => {
      // EventSource will auto-reconnect; log for debugging
      // If server returns 401/403 the connection will be closed
      console.debug('SSE error', ev)
    })

    return () => {
      try {
        if (es) {
          es.removeEventListener('tasks:update', onTasksUpdate)
          es.close()
        }
      } catch (err) {
        // ignore
      }
    }
  }, [token, fetchTasks])

  const handleCreateTask = async (title: string, assignedToIds: number[] | null, brandId: number | null, dueDate: string | null, startDate: string | null) => {
    if (!token) return

        try {
        const response = await fetch(`/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, assignedToIds, brandId, dueDate, startDate }),
      })
      if (!response.ok) throw new Error('Error al crear tarea')
      const newTask = await response.json()
      setTasks(prev => [newTask, ...prev])
      showNotification('Tarea creada')
    } catch (err) {
      console.error(err)
      showNotification('No se pudo crear la tarea')
    }
  }

  const handleUpdateTaskStatus = async (taskId: number, newStatus: Task['status']) => {
    if (!token) return

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))

        try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch (err) {
      console.error(err)
      showNotification('Error al actualizar tarea')
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!token) return

    if (!window.confirm('¿Eliminar esta tarea?')) return

    setTasks(prev => prev.filter(t => t.id !== taskId))

        try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      showNotification('Tarea eliminada')
    } catch (err) {
      console.error(err)
      showNotification('Error al eliminar tarea')
    }
  }

  const handleUpdateTask = async (id: number, payload: Partial<{ title: string; assignedToId?: number | null; assignedToIds?: number[] | null; brandId: number | null; dueDate: string | null; startDate: string | null; description?: string }>) => {
    if (!token) return false
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.message || 'Error al actualizar tarea')
      }
      const updated = await response.json()
      setTasks(prev => prev.map(t => t.id === id ? updated : t))
      showNotification('Tarea actualizada')
      return true
    } catch (err) {
      console.error(err)
      showNotification('No se pudo actualizar la tarea')
      return false
    }
  }

  const handleAssignTask = async (taskId: number, assignedToIds: number[] | null) => {
    if (!token) return

    // Update both single-assignee compatibility and multi-assignee members list optimistically
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const first = Array.isArray(assignedToIds) && assignedToIds.length > 0 ? assignedToIds[0] : null
      const members = Array.isArray(assignedToIds) && assignedToIds.length > 0
        ? teamMembers.filter(m => assignedToIds!.includes(m.id)).map(m => ({ id: m.id, name: m.name, photoUrl: m.photoUrl }))
        : []
      return { ...t, assignedToId: first, assignedToIds: assignedToIds ?? [], assignedToMembers: members }
    }))

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ assignedToIds: assignedToIds ?? [] }),
      })
    } catch (err) {
      console.error(err)
      showNotification('Error al asignar tarea')
    }
  }

  const handleCreateSubtask = async (taskId: number, title: string) => {
    if (!token) return null
    const tempId = -Date.now()
    // optimistic
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const subt = (t as any).subtasks ? [...(t as any).subtasks] : []
      subt.push({ id: tempId, taskId, title, status: 'pending', createdAt: new Date().toISOString() })
      return { ...t, subtasks: subt }
    }))

    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title })
      })
      if (!res.ok) throw new Error('Error al crear subtarea')
      const created = await res.json()
      setTasks(prev => prev.map(t => {
        if (t.id !== taskId) return t
        const subs = ((t as any).subtasks || []).filter((s: any) => s.id !== tempId)
        subs.push({ id: created.id, taskId: created.task_id || taskId, title: created.title, status: created.status, position: created.position, createdAt: created.created_at, updatedAt: created.updated_at })
        return { ...t, subtasks: subs }
      }))
      return created
    } catch (err) {
      console.error(err)
      showNotification('No se pudo crear la subtarea')
      // rollback optimistic
      setTasks(prev => prev.map(t => {
        if (t.id !== taskId) return t
        return { ...t, subtasks: ((t as any).subtasks || []).filter((s: any) => s.id !== tempId) }
      }))
      return null
    }
  }

  const handleUpdateSubtask = async (subtaskId: number, payload: Partial<{ title: string; status: string }>) => {
    if (!token) return null
    // optimistic update
    setTasks(prev => prev.map(t => {
      const subs = ((t as any).subtasks || []).map((s: any) => s.id === subtaskId ? { ...s, ...payload } : s)
      return { ...t, subtasks: subs }
    }))
    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Error al actualizar subtarea')
      const updated = await res.json()
      // ensure final state matches server
      setTasks(prev => prev.map(t => ({ ...t, subtasks: ((t as any).subtasks || []).map((s: any) => s.id === subtaskId ? { id: updated.id, taskId: updated.task_id, title: updated.title, status: updated.status, position: updated.position, createdAt: updated.created_at, updatedAt: updated.updated_at } : s) })))
      return updated
    } catch (err) {
      console.error(err)
      showNotification('No se pudo actualizar la subtarea')
      return null
    }
  }

  const handleDeleteSubtask = async (subtaskId: number) => {
    if (!token) return false
    // optimistic
    let removedFromTaskId: number | null = null
    setTasks(prev => prev.map(t => {
      const exists = (t as any).subtasks && (t as any).subtasks.find((s: any) => s.id === subtaskId)
      if (exists) removedFromTaskId = t.id
      return { ...t, subtasks: ((t as any).subtasks || []).filter((s: any) => s.id !== subtaskId) }
    }))
    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      if (!res.ok) throw new Error('Error al eliminar subtarea')
      showNotification('Subtarea eliminada')
      return true
    } catch (err) {
      console.error(err)
      showNotification('No se pudo eliminar la subtarea')
      // rollback: refetch tasks to restore state
      if (removedFromTaskId) fetchTasks(token)
      return false
    }
  }

  const handleTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const taskId = Number(active.id.toString().replace('task-', ''))
    const overId = over.id.toString()

    // If dropping over a column
    if (overId.startsWith('column-')) {
      const newStatus = overId.replace('column-', '') as Task['status']
      const task = tasks.find(t => t.id === taskId)
      if (task && task.status !== newStatus) {
        handleUpdateTaskStatus(taskId, newStatus)
      }
    }
  }

  useEffect(() => {
    // Super Admin no necesita cargar datos de leads, tasks, brands, etc.
    if (currentUser?.isSuperAdmin) {
      return
    }

    if (isAuthenticated && token) {
      if (activeTab === 'overview') {
        fetchLeads(token)
        fetchTasks(token)
        fetchBrands(token)
        fetchTeamMembers(token)
      } else if (activeTab === 'tasks') {
        fetchTasks(token)
        fetchBrands(token)
      } else if (activeTab === 'brands') {
        fetchBrands(token)
      } else if (activeTab === 'blog') {
        fetchBlogPosts()
      }
    }
  }, [isAuthenticated, activeTab, fetchTasks, fetchBrands, fetchBlogPosts, fetchLeads, fetchTeamMembers, token, currentUser?.isSuperAdmin])

  const serviceOptions = useMemo(() => {
    const options = new Set<string>()
    leads.forEach((lead) => {
      lead.services.forEach((service) => {
        const value = service.trim()
        if (value) options.add(value)
      })
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [leads])

  const tagOptions = useMemo(() => {
    const options = new Set<string>()
    leads.forEach((lead) => {
      if (lead.tags) {
        lead.tags.forEach((tag) => {
          const value = tag.trim()
          if (value) options.add(value)
        })
      }
    })
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [leads])

  const handleDragEnd = (event: DragEndEvent) => {
    const leadId = Number(event.active.id)
    const overId = event.over?.id

    if (Number.isNaN(leadId) || !overId) {
      return
    }

    if (!STATUS_OPTIONS.includes(overId as LeadStatus)) {
      return
    }

    const newStatus = overId as LeadStatus
    const lead = leads.find((item) => item.id === leadId)

    if (lead && lead.status !== newStatus) {
      handleStatusChange(leadId, newStatus)
    }
  }

  const activeLead = activeLeadId ? leads.find((lead) => lead.id === activeLeadId) : null

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    try {
        const response = await fetch(`/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await response.json()
      if (response.ok) {
        showNotification('Contraseña actualizada correctamente')
        return true
      } else {
        showNotification(data.message || 'Error al cambiar la contraseña')
        return false
      }
    } catch {
      showNotification('Error de conexión')
      return false
    }
  }

  const handleForgotPassword = async (email: string) => {
    try {
        const response = await fetch(`/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      showNotification(data.message)
      return true
    } catch {
      showNotification('Error de conexión')
      return false
    }
  }

  const handleResetPassword = async (token: string, newPassword: string) => {
    try {
        const response = await fetch(`/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await response.json()
      if (response.ok) {
        showNotification('Contraseña restablecida. Inicia sesión.')
        return true
      } else {
        showNotification(data.message || 'Error al restablecer')
        return false
      }
    } catch {
      showNotification('Error de conexión')
      return false
    }
  }

  return {
    showNotification,
    handleChangePassword,
    handleForgotPassword,
    handleResetPassword,
    leads,
    teamMembers,
    currentUser,
    loading,
    membersLoading,
    teamMemberSaving,
    username,
    password,
    isAuthenticated,
    error,
    notification,
    statusFilter,
    assignedFilter,
    serviceFilter,
    tagFilter,
    showAttentionOnly,
    searchTerm,
    activeLeadId,
    noteDraft,
    viewMode,
    teamMemberForm,
    editingMemberId,
    activeTab,
    filteredLeads,
    metrics,
    leadsByStatus,
    attentionLeads,
    assignmentStats,
    recentLeads,
    assignmentOptions,
    serviceOptions,
    tagOptions,
    activeLead,
    setUsername,
    setPassword,
    setStatusFilter,
    setAssignedFilter,
    setServiceFilter,
    setTagFilter,
    setShowAttentionOnly,
    setSearchTerm,
    setActiveLeadId,
    setNoteDraft,
    setViewMode,
    setActiveTab,
    handleLogin,
    handleLogout,
    handleStatusChange,
    handleAssignLead,
    handleDeleteLead,
    handleTeamMemberFieldChange,
    handleTeamMemberCheckboxChange,
    handleTeamMemberPhotoChange,
    handleTeamMemberSetPhotoFile,
    handleEditTeamMember,
    handleTeamMemberSubmit,
    handleCancelTeamMemberEdit,
    handleDeleteTeamMember,
    handleMarkContact,
    handleAssignmentSelect,
    handleOpenNotes,
    handleSaveNote,
    handleAddTag,
    handleRemoveTag,
    handleExportCSV,
    copyToClipboard,
    getEmails,
    fetchLeads,
    fetchTasks,
    fetchBrands,
    tasks,
    brands,
    tasksLoading,
    brandsLoading,
    taskAssignmentOptions,
    handleCreateTask,
    handleUpdateTask,
    handleUpdateTaskStatus,
    handleDeleteTask,
    handleAssignTask,
    handleCreateSubtask,
    handleUpdateSubtask,
    handleDeleteSubtask,
    handleTaskDragEnd,
    handleDragEnd,
    handleCreateBrand,
    handleUpdateBrand,
    handleDeleteBrand,
    brandFilter,
    setBrandFilter,
    taskViewMode,
    setTaskViewMode,
    taskMonthFilter,
    setTaskMonthFilter,
    filteredTasks,
    blogPosts,
    blogLoading,
    fetchBlogPosts,
    handleCreateBlogPost,
    handleUpdateBlogPost,
    handleDeleteBlogPost,
    emailTemplates,
    emailLoading,
    fetchEmailTemplates,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    sendEmail,
    scheduleEmail,
  }
}
