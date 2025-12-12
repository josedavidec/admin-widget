import { useState, useEffect, lazy, Suspense } from 'react'
import { useAdminLogic } from '../hooks/useAdminLogic'
import { useTheme } from '../hooks/useTheme'

// Lazy-load admin subcomponents to reduce initial admin bundle size
const BrandManager = lazy(() => import('../components/admin/BrandManager').then(m => ({ default: m.BrandManager })))
const BlogManager = lazy(() => import('../components/admin/BlogManager').then(m => ({ default: m.BlogManager })))
const LeadManager = lazy(() => import('../components/admin/leads/LeadManager').then(m => ({ default: m.LeadManager })))
const TeamManager = lazy(() => import('../components/admin/team/TeamManager').then(m => ({ default: m.TeamManager })))
const TaskManager = lazy(() => import('../components/admin/tasks/TaskManager').then(m => ({ default: m.TaskManager })))
const DashboardOverview = lazy(() => import('../components/admin/dashboard/DashboardOverview').then(m => ({ default: m.DashboardOverview })))
const SectionManager = lazy(() => import('../components/admin/SectionManager').then(m => ({ default: m.SectionManager })))
const EmailTemplatesManager = lazy(() => import('../components/admin/EmailTemplatesManager'))
const SocialMetricsPanel = lazy(() => import('../components/admin/SocialMetricsPanel').then(m => ({ default: m.SocialMetricsPanel })))
const MediaLibrary = lazy(() => import('../components/admin/MediaLibrary'))

export default function AdminPage() {
  const {
    teamMembers,
    loading,
    membersLoading,
    teamMemberSaving,
    username,
    password,
    isAuthenticated,
    error,
    notification,
    showNotification,
    statusFilter,
    assignedFilter,
    serviceFilter,
    tagFilter,
    brandFilter,
    showAttentionOnly,
    searchTerm,
    noteDraft,
    viewMode,
    taskViewMode,
    teamMemberForm,
    editingMemberId,
    activeTab,
    filteredLeads,
    metrics,
    leads,
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
    setBrandFilter,
    setShowAttentionOnly,
    setSearchTerm,
    setActiveLeadId,
    setNoteDraft,
    setViewMode,
    setTaskViewMode,
    taskMonthFilter,
    setTaskMonthFilter,
    filteredTasks,
    setActiveTab,
    handleLogin,
    handleLogout,
    handleStatusChange,
    handleDeleteLead,
    handleTeamMemberFieldChange,
    handleEditTeamMember,
    handleTeamMemberSubmit,
    handleCancelTeamMemberEdit,
    handleDeleteTeamMember,
    handleMarkContact,
    handleAssignmentSelect,
    handleOpenNotes,
    handleSaveNote,
    handleExportCSV,
    handleDragEnd,
    fetchLeads,
    handleAddTag,
    handleRemoveTag,
    handleTeamMemberCheckboxChange,
    handleTeamMemberPhotoChange,
    handleTeamMemberSetPhotoFile,
    tasks,
    brands,
    brandsLoading,
    taskAssignmentOptions,
    handleCreateTask,
    handleUpdateTaskStatus,
    handleUpdateTask,
    handleAssignTask,
    handleCreateSubtask,
    handleUpdateSubtask,
    handleDeleteSubtask,
    handleTaskDragEnd,
    handleDeleteTask,
    handleCreateBrand,
    handleUpdateBrand,
    handleDeleteBrand,
    currentUser,
    handleChangePassword,
    handleForgotPassword,
    handleResetPassword,
    blogPosts,
    blogLoading,
    emailTemplates,
    emailLoading,
    fetchEmailTemplates,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    sendEmail,
    scheduleEmail,
    handleCreateBlogPost,
    handleUpdateBlogPost,
    handleDeleteBlogPost,
  } = useAdminLogic()

  // Email manager is now a full section/tab (not a modal)

  const { theme, toggleTheme } = useTheme()
  const [logoUrl, setLogoUrl] = useState<string>(() => localStorage.getItem('site_logo') || '/uploads/LOGO1.webp')
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [authView, setAuthView] = useState<'login' | 'forgot' | 'reset'>('login')
  const [resetToken, setResetToken] = useState('')
  const [sections, setSections] = useState({
    leads: true,
    team: true,
    tasks: true,
    brands: true,
    blog: true,
    emails: true,
    media: true,
    social: true,
  })
  // Merge defaults with server-provided sectionSettings so missing keys default to true
  const defaultSections = { leads: true, team: true, tasks: true, brands: true, blog: true, emails: true, media: true, social: true }
  const allowedSections = { ...defaultSections, ...(currentUser?.sectionSettings ?? {}) }
  
  // Form states
  const [changePassForm, setChangePassForm] = useState({ current: '', new: '', confirm: '' })
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetForm, setResetForm] = useState({ new: '', confirm: '' })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      setResetToken(token)
      setAuthView('reset')
    }
  }, [])

  // Cargar secciones cuando el Super Admin está autenticado
  useEffect(() => {
    if (currentUser?.isSuperAdmin && isAuthenticated) {
      const fetchSections = async () => {
        try {
          const response = await fetch(`/api/section-settings`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            setSections(data)
          }
        } catch (err) {
          console.error('Error al cargar secciones:', err)
        }
      }

      fetchSections()
    }
  }, [currentUser?.isSuperAdmin, isAuthenticated])

  // Load server site settings (logo) to initialize admin logo
  useEffect(() => {
    let mounted = true
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/site-settings')
        if (!res.ok) return
        const data = await res.json()
        if (mounted && data?.logo_url) {
          setLogoUrl(data.logo_url)
          try { localStorage.setItem('site_logo', data.logo_url) } catch (e) {}
        }
      } catch (err) {
        // ignore
      }
    }
    void fetchSettings()
    return () => { mounted = false }
  }, [])

  const handleSectionChange = async (section: keyof typeof sections, enabled: boolean) => {
    // Actualizar estado local
    const newSections = { ...sections, [section]: enabled }
    setSections(newSections)
    
    // Guardar en el servidor
    try {
      const response = await fetch(`/api/section-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(newSections)
      })

      if (!response.ok) {
        console.error('Error al guardar configuración de secciones')
        // Revertir cambio si falla
        setSections(sections)
      } else {
        console.log(`Sección ${section} actualizada a ${enabled}`)
      }
    } catch (err) {
      console.error('Error al guardar secciones:', err)
      // Revertir cambio si falla
      setSections(sections)
    }
  }

  if (!isAuthenticated) {
    if (authView === 'forgot') {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-200">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full transition-colors duration-200">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Recuperar Contraseña</h1>
            <form onSubmit={async (e) => {
              e.preventDefault()
              await handleForgotPassword(forgotEmail)
              setAuthView('login')
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="tu@email.com"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                Enviar instrucciones
              </button>
              <button type="button" onClick={() => setAuthView('login')} className="w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm">
                Volver al login
              </button>
            </form>
          </div>
        </div>
      )
    }

    if (authView === 'reset') {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-200">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full transition-colors duration-200">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Nueva Contraseña</h1>
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (resetForm.new !== resetForm.confirm) {
                alert('Las contraseñas no coinciden')
                return
              }
              const success = await handleResetPassword(resetToken, resetForm.new)
              if (success) {
                setAuthView('login')
                window.history.replaceState({}, document.title, window.location.pathname)
              }
            }} className="space-y-4">
              <input type="text" autoComplete="username" className="hidden" readOnly />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nueva contraseña</label>
                <input
                  type="password"
                  value={resetForm.new}
                  onChange={(e) => setResetForm({ ...resetForm, new: e.target.value })}
                  autoComplete="new-password"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar contraseña</label>
                <input
                  type="password"
                  value={resetForm.confirm}
                  onChange={(e) => setResetForm({ ...resetForm, confirm: e.target.value })}
                  autoComplete="new-password"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                Restablecer contraseña
              </button>
            </form>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-200">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full transition-colors duration-200">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="admin-username">
                Correo electrónico
              </label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="admin@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Ingresa tu contraseña"
              />
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => setAuthView('forgot')} className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black"><div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"/></div>}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 md:p-8 transition-colors duration-200">
      <div className="mx-auto max-w-[1920px]">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="flex flex-col gap-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm lg:w-64 shrink-0 transition-colors duration-200">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Navegación</p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {currentUser?.isSuperAdmin ? 'Panel Super Admin' : 'Panel Admin'}
              </h2>
              <div className="w-32 mx-auto">
                <div className="relative group">
                  <img src={logoUrl} className="w-32 mx-auto" alt="Logo" />
                  <button
                    type="button"
                    onClick={() => setShowMediaModal(true)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity rounded"
                  >
                    Cambiar logo
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {currentUser?.isSuperAdmin ? 'Gestiona secciones y administradores.' : 'Gestiona leads, tareas y equipo.'}
              </p>
            </div>
            <nav className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
              >
                {currentUser?.isSuperAdmin ? 'Secciones' : 'Resumen'}
                <span
                  className={`block text-xs font-normal lg:hidden ${activeTab === 'overview' ? 'text-white/80' : 'text-gray-500'}`}
                >
                  {currentUser?.isSuperAdmin ? 'Gestión de funcionalidades' : 'Vista general y métricas'}
                </span>
              </button>

              {/* Super Admin: Solo Team tab */}
              {currentUser?.isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('team')}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${activeTab === 'team' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                >
                  Administradores
                  <span
                    className={`block text-xs font-normal lg:hidden ${activeTab === 'team' ? 'text-white/80' : 'text-gray-500'}`}
                  >
                    Crear y gestionar admins
                  </span>
                </button>
              )}
              {currentUser?.isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('media')}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${activeTab === 'media' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                >
                  Media
                  <span className={`block text-xs font-normal lg:hidden ${activeTab === 'media' ? 'text-white/80' : 'text-gray-500'}`}>Biblioteca de medios</span>
                </button>
              )}

              {/* Admin/Members: Regular tabs */}
              {!currentUser?.isSuperAdmin && (
                <>
                  {allowedSections.leads && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('leads')}
                      className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${activeTab === 'leads' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                    >
                      Leads
                      <span
                        className={`block text-xs font-normal lg:hidden ${activeTab === 'leads' ? 'text-white/80' : 'text-gray-500'}`}
                      >
                        Métricas, filtros y pipeline
                      </span>
                    </button>
                  )}
                  
                  {currentUser?.isAdmin && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('team')}
                      className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${activeTab === 'team' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                    >
                      Equipo
                      <span
                        className={`block text-xs font-normal lg:hidden ${activeTab === 'team' ? 'text-white/80' : 'text-gray-500'}`}
                      >
                        Tu equipo comercial
                      </span>
                    </button>
                  )}

                  {allowedSections.tasks && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('tasks')}
                      className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${activeTab === 'tasks' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                    >
                      Tareas
                      <span
                        className={`block text-xs font-normal lg:hidden ${activeTab === 'tasks' ? 'text-white/80' : 'text-gray-500'}`}
                      >
                        Gestor de tareas
                      </span>
                    </button>
                  )}

                  {allowedSections.brands && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('brands')}
                      className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${activeTab === 'brands' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                    >
                      Marcas
                      <span
                        className={`block text-xs font-normal lg:hidden ${activeTab === 'brands' ? 'text-white/80' : 'text-gray-500'}`}
                      >
                        Gestión de clientes
                      </span>
                    </button>
                  )}

                  {allowedSections.media && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('media')}
                      className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${activeTab === 'media' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                    >
                      Media
                      <span className={`block text-xs font-normal lg:hidden ${activeTab === 'media' ? 'text-white/80' : 'text-gray-500'}`}>Biblioteca de medios</span>
                    </button>
                  )}

                  {allowedSections.brands && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('social')}
                      className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${activeTab === 'social' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                    >
                      Redes Sociales
                      <span
                        className={`block text-xs font-normal lg:hidden ${activeTab === 'social' ? 'text-white/80' : 'text-gray-500'}`}
                      >
                        Métricas por marca
                      </span>
                    </button>
                  )}

                  {allowedSections.blog && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('blog')}
                      className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${activeTab === 'blog' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                    >
                      Blog
                      <span
                        className={`block text-xs font-normal lg:hidden ${activeTab === 'blog' ? 'text-white/80' : 'text-gray-500'}`}
                      >
                        Gestión de entradas
                      </span>
                    </button>
                  )}
                  {/* Emails section */}
                  {allowedSections.emails && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('emails')}
                      className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${activeTab === 'emails' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                    >
                      Emails
                      <span className={`block text-xs font-normal lg:hidden text-gray-500`}>Plantillas y envíos</span>
                    </button>
                  )}
                </>
              )}
            </nav>
            <div className="mt-auto flex flex-col gap-2">
              {currentUser && (
                <div className="mb-2 flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-700/50">
                  {currentUser.photoUrl ? (
                    <img
                      src={currentUser.photoUrl}
                      alt={currentUser.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {currentUser.name}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {currentUser.role || 'Sin rol'}
                    </p>
                    <button 
                      onClick={() => setShowChangePassword(true)}
                      className="text-[10px] text-blue-600 hover:underline dark:text-blue-400 mt-0.5"
                    >
                      Cambiar contraseña
                    </button>
                  </div>
                </div>
              )}
              <button
                onClick={toggleTheme}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {theme === 'light' ? '🌙 Modo Oscuro' : '☀️ Modo Claro'}
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20"
              >
                Cerrar sesión
              </button>
            </div>
          </aside>
          <div className="flex-1 space-y-8 min-w-0">
            {currentUser?.isSuperAdmin ? (
              // Super Admin view: Solo gestión de secciones y equipo
              activeTab === 'overview' ? (
                <SectionManager
                  isSuperAdmin={true}
                  sections={sections}
                  onSectionChange={handleSectionChange}
                />
              ) : activeTab === 'team' ? (
                <TeamManager
                  teamMembers={teamMembers}
                  membersLoading={membersLoading}
                  currentUser={currentUser}
                  teamMemberForm={teamMemberForm}
                  editingMemberId={editingMemberId}
                  teamMemberSaving={teamMemberSaving}
                  onFieldChange={handleTeamMemberFieldChange}
                  onCheckboxChange={handleTeamMemberCheckboxChange}
                  onPhotoChange={handleTeamMemberPhotoChange}
                  onPhotoSelect={handleTeamMemberSetPhotoFile}
                  onSubmit={handleTeamMemberSubmit}
                  onEdit={handleEditTeamMember}
                  onDelete={handleDeleteTeamMember}
                  onCancelEdit={handleCancelTeamMemberEdit}
                />
              ) : activeTab === 'media' ? (
                <div className="p-4">
                  <MediaLibrary inline onSelect={() => { /* noop for inline library */ }} onNotify={showNotification} />
                </div>
              ) : null
            ) : (
              // Admin/Team member view: Todas las secciones normales
              activeTab === 'overview' ? (
                <DashboardOverview
                  leads={leads}
                  tasks={tasks}
                  teamMembers={teamMembers}
                  brands={brands}
                  onNavigate={setActiveTab}
                />
              ) : activeTab === 'leads' ? (
                <LeadManager
                  leads={leads}
                  filteredLeads={filteredLeads}
                  loading={loading}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  assignedFilter={assignedFilter}
                  setAssignedFilter={setAssignedFilter}
                  serviceFilter={serviceFilter}
                  setServiceFilter={setServiceFilter}
                  tagFilter={tagFilter}
                  setTagFilter={setTagFilter}
                  showAttentionOnly={showAttentionOnly}
                  setShowAttentionOnly={setShowAttentionOnly}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  assignmentOptions={assignmentOptions}
                  serviceOptions={serviceOptions}
                  tagOptions={tagOptions}
                  metrics={metrics}
                  onStatusChange={handleStatusChange}
                  onAssignmentChange={(id, assignedTo) => handleAssignmentSelect(id, assignedTo)}
                  onMarkContact={handleMarkContact}
                  onDelete={handleDeleteLead}
                  onOpenNotes={handleOpenNotes}
                  onDragEnd={handleDragEnd}
                  onRefresh={fetchLeads}
                  onExportCSV={handleExportCSV}
                />
              ) : activeTab === 'team' ? (
                <TeamManager
                  teamMembers={teamMembers}
                  membersLoading={membersLoading}
                  currentUser={currentUser}
                  teamMemberForm={teamMemberForm}
                  editingMemberId={editingMemberId}
                  teamMemberSaving={teamMemberSaving}
                  onFieldChange={handleTeamMemberFieldChange}
                  onCheckboxChange={handleTeamMemberCheckboxChange}
                  onPhotoChange={handleTeamMemberPhotoChange}
                  onSubmit={handleTeamMemberSubmit}
                  onEdit={handleEditTeamMember}
                  onDelete={handleDeleteTeamMember}
                  onCancelEdit={handleCancelTeamMemberEdit}
                />
              ) : activeTab === 'brands' ? (
                <BrandManager 
                  brands={brands} 
                  loading={brandsLoading} 
                  onCreate={handleCreateBrand} 
                  onUpdate={handleUpdateBrand}
                  onDelete={handleDeleteBrand} 
                />
              ) : activeTab === 'media' ? (
                <div className="p-4">
                  <MediaLibrary inline onNotify={showNotification} />
                </div>
              ) : activeTab === 'social' ? (
                <SocialMetricsPanel
                  brands={brands}
                  selectedBrandId={null}
                />
              ) : activeTab === 'blog' ? (
                <BlogManager
                  posts={blogPosts}
                  loading={blogLoading}
                  onCreate={handleCreateBlogPost}
                  onUpdate={handleUpdateBlogPost}
                  onDelete={handleDeleteBlogPost}
                />
              ) : activeTab === 'emails' ? (
                <EmailTemplatesManager
                  emailTemplates={emailTemplates}
                  emailLoading={emailLoading}
                  fetchEmailTemplates={fetchEmailTemplates}
                  createEmailTemplate={createEmailTemplate}
                  updateEmailTemplate={updateEmailTemplate}
                  deleteEmailTemplate={deleteEmailTemplate}
                  sendEmail={sendEmail}
                  scheduleEmail={scheduleEmail}
                />
              ) : (
                <TaskManager
                  tasks={tasks}
                  brands={brands}
                  assignmentOptions={taskAssignmentOptions}
                  viewMode={taskViewMode}
                  setViewMode={setTaskViewMode}
                  monthFilter={taskMonthFilter}
                  setMonthFilter={setTaskMonthFilter}
                  filteredTasks={filteredTasks}
                  onCreate={handleCreateTask}
                  onUpdateStatus={handleUpdateTaskStatus}
                  onUpdateTask={handleUpdateTask}
                  onAssign={handleAssignTask}
                  onCreateSubtask={handleCreateSubtask}
                  onUpdateSubtask={handleUpdateSubtask}
                  onDeleteSubtask={handleDeleteSubtask}
                  onDelete={handleDeleteTask}
                  onDragEnd={handleTaskDragEnd}
                  brandFilter={brandFilter}
                  setBrandFilter={setBrandFilter}
                />
              )
            )}
          </div>
        </div>

        {notification && (
          <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg">
            {notification}
          </div>
        )}

        {showMediaModal && (
          <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black"><div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"/></div>}>
            <MediaLibrary
              onClose={() => setShowMediaModal(false)}
              onNotify={showNotification}
              onSelect={async (url: string) => {
                setLogoUrl(url)
                try { localStorage.setItem('site_logo', url) } catch (e) {}
                // persist in server
                try {
                  const token = localStorage.getItem('auth_token')
                  await fetch('/api/site-settings', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({ logo_url: url }),
                  })
                } catch (err) {
                  console.error('Error saving logo to server', err)
                }
                setShowMediaModal(false)
              }}
            />
          </Suspense>
        )}

        {/* Email manager is now rendered as its own section (see activeTab === 'emails') */}

        {activeLead && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Nota interna</h2>
                  <p className="text-xs text-gray-500">
                    {activeLead.name} · {activeLead.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveLeadId(null)
                    setNoteDraft('')
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cerrar
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Etiquetas</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {activeLead.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 border border-indigo-100"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(activeLead.id, tag)}
                          className="text-indigo-400 hover:text-indigo-600 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag(activeLead.id, tagInput)
                          setTagInput('')
                        }
                      }}
                      placeholder="Nueva etiqueta..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                    <button
                      onClick={() => {
                        handleAddTag(activeLead.id, tagInput)
                        setTagInput('')
                      }}
                      disabled={!tagInput.trim()}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                <textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Añade contexto sobre conversaciones, próximos pasos o recordatorios para el equipo."
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setActiveLeadId(null)
                      setNoteDraft('')
                    }}
                    className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    Guardar nota
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showChangePassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Cambiar Contraseña</h2>
              <form onSubmit={async (e) => {
                e.preventDefault()
                if (changePassForm.new !== changePassForm.confirm) {
                  alert('Las contraseñas no coinciden')
                  return
                }
                const success = await handleChangePassword(changePassForm.current, changePassForm.new)
                if (success) {
                  setShowChangePassword(false)
                  setChangePassForm({ current: '', new: '', confirm: '' })
                }
              }} className="space-y-4">
                <input type="text" autoComplete="username" className="hidden" readOnly value={currentUser?.email || ''} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña actual</label>
                  <input
                    type="password"
                    value={changePassForm.current}
                    onChange={(e) => setChangePassForm({ ...changePassForm, current: e.target.value })}
                    autoComplete="current-password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nueva contraseña</label>
                  <input
                    type="password"
                    value={changePassForm.new}
                    onChange={(e) => setChangePassForm({ ...changePassForm, new: e.target.value })}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    value={changePassForm.confirm}
                    onChange={(e) => setChangePassForm({ ...changePassForm, confirm: e.target.value })}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowChangePassword(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                  >
                    Cambiar contraseña
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      </div>
    </Suspense>
  )
}
