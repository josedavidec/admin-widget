import { useState, useRef, useEffect } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { TaskBoardColumn } from './TaskBoardColumn'
import { TaskCalendar } from './TaskCalendar'
import { TaskCard } from './TaskCard'
import { type Task, type TeamMember, type Brand } from '../../../types/admin'
import { formatDateUTC } from '../../../utils/adminUtils'
import Avatar from '../ui/Avatar'
import { DragOverlay } from '@dnd-kit/core'

type TaskManagerProps = {
  tasks: Task[]
  brands: Brand[]
  assignmentOptions: TeamMember[]
  viewMode: 'list' | 'board' | 'calendar'
  setViewMode: (mode: 'list' | 'board' | 'calendar') => void
  monthFilter: string
  setMonthFilter: (month: string) => void
  filteredTasks: Task[]
  onCreate: (title: string, assignedToIds: number[] | null, brandId: number | null, dueDate: string | null, startDate: string | null) => void
  onUpdateTask?: (id: number, payload: Partial<{ title: string; assignedToId?: number | null; assignedToIds?: number[] | null; brandId: number | null; dueDate: string | null; startDate: string | null; description?: string }>) => Promise<boolean>
  onUpdateStatus: (id: number, status: Task['status']) => void
  onAssign: (taskId: number, assignedToIds: number[] | null) => void
  onDelete: (id: number) => void
  onDragEnd: (event: DragEndEvent) => void
  onRefresh?: () => Promise<void> | void
  brandFilter: string
  setBrandFilter: (filter: string) => void
  onCreateSubtask?: (taskId: number, title: string) => Promise<any> | null
  onUpdateSubtask?: (subtaskId: number, payload: Partial<{ title: string; status: string }>) => Promise<any> | null
  onDeleteSubtask?: (subtaskId: number) => Promise<boolean> | null
}

export function TaskManager({
  brands,
  assignmentOptions,
  viewMode,
  setViewMode,
  monthFilter,
  setMonthFilter,
  filteredTasks,
  onCreate,
  onUpdateStatus,
  onAssign,
  onDelete,
  onDragEnd,
  onRefresh,
  brandFilter,
  setBrandFilter
  , onUpdateTask
  , onCreateSubtask, onUpdateSubtask, onDeleteSubtask
}: TaskManagerProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)
  const [creatorAssignedIds, setCreatorAssignedIds] = useState<number[]>([])
  const [showAssignDropdown, setShowAssignDropdown] = useState(false)
  const assignDropdownRef = useRef<HTMLDivElement | null>(null)
  const assignButtonRef = useRef<HTMLButtonElement | null>(null)
  // enable auto-refresh by default (no visible controls)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null)
  const refreshIntervalRef = useRef<number | null>(null)
  const REFRESH_INTERVAL_MS = 5000

  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const activeTask = activeDragId ? (() => {
    const m = activeDragId.match(/^task-(\d+)$/)
    if (!m) return null
    const id = Number(m[1])
    return filteredTasks.find(t => t.id === id) || null
  })() : null

  const [showNewSubtaskFor, setShowNewSubtaskFor] = useState<number | null>(null)
  const [newSubtaskTexts, setNewSubtaskTexts] = useState<Record<number, string>>({})

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!showAssignDropdown) return
      if (assignDropdownRef.current && assignDropdownRef.current.contains(target)) return
      if (assignButtonRef.current && assignButtonRef.current.contains(target)) return
      setShowAssignDropdown(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [showAssignDropdown])

  // polling effect for auto-refresh
  useEffect(() => {
    if (!autoRefresh || typeof onRefresh !== 'function') return
    // start interval
    refreshIntervalRef.current = window.setInterval(async () => {
      try {
        await onRefresh()
        setLastRefreshed(Date.now())
      } catch (err) {
        console.error('Auto-refresh failed', err)
      }
    }, REFRESH_INTERVAL_MS)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [autoRefresh, onRefresh])

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id)
    // populate form fields if available
    const form = formRef.current
    if (form) {
      const titleEl = form.elements.namedItem('title') as HTMLInputElement | null
      const assignedEl = form.elements.namedItem('assignedToIds') as HTMLSelectElement | null
      const brandEl = form.elements.namedItem('brandId') as HTMLSelectElement | null
      const dueEl = form.elements.namedItem('dueDate') as HTMLInputElement | null
      const startEl = form.elements.namedItem('startDate') as HTMLInputElement | null
      if (titleEl) titleEl.value = task.title || ''
      if (assignedEl && (assignedEl as any).options) {
        // mark selected options (for select multiple)
        const values = (task.assignedToIds && task.assignedToIds.length > 0) ? task.assignedToIds : (task.assignedToId ? [task.assignedToId] : [])
        for (const opt of Array.from((assignedEl as any).options)) {
          opt.selected = values.includes(Number(opt.value))
        }
        // also sync controlled creatorAssignedIds for the create/edit form
        setCreatorAssignedIds(values)
      } else {
        // mark checkboxes if present
        try {
          const values = (task.assignedToIds && task.assignedToIds.length > 0) ? task.assignedToIds : (task.assignedToId ? [task.assignedToId] : [])
          setCreatorAssignedIds(values)
        } catch (err) {
          // ignore
        }
      }
      if (brandEl) brandEl.value = task.brandId ? String(task.brandId) : ''
      if (dueEl) dueEl.value = task.dueDate ? task.dueDate.split('T')[0] : ''
      if (startEl) startEl.value = task.startDate ? task.startDate.split('T')[0] : ''
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gestión de Tareas</h2>
          <div className="flex overflow-hidden rounded-lg border border-gray-300 bg-white text-sm font-medium shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
            >
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 transition-colors ${viewMode === 'board' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
            >
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 transition-colors ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
            >
              Calendario
            </button>
          </div>
        </div>

          <div className="flex items-center gap-3">
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
          />
          {/* Auto-refresh enabled by default (no visible controls) */}
        </div>
      </div>

      {/* Create Task Form */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Nueva Tarea</h3>
        <form
          onSubmit={async (e) => {
              e.preventDefault()
              const form = e.currentTarget
              const title = (form.elements.namedItem('title') as HTMLInputElement).value
              // use controlled state for assigned ids in creator form
              const assignedTo = Array.isArray(creatorAssignedIds) ? creatorAssignedIds : []
              const brandId = (form.elements.namedItem('brandId') as HTMLSelectElement).value
              const dueDate = (form.elements.namedItem('dueDate') as HTMLInputElement).value
              const startDate = (form.elements.namedItem('startDate') as HTMLInputElement).value
            
                if (!title.trim()) return

                if (editingTaskId != null && typeof onUpdateTask === 'function') {
                  await onUpdateTask(editingTaskId, {
                    title: title.trim(),
                    assignedToIds: Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [Number(assignedTo)] : []),
                    brandId: brandId ? Number(brandId) : null,
                    dueDate: dueDate || null,
                    startDate: startDate || null,
                  })
                  setEditingTaskId(null)
                } else if (editingTaskId != null) {
                  // fallback to create if update handler not provided
                  onCreate(title.trim(), Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [Number(assignedTo)] : []), brandId ? Number(brandId) : null, dueDate || null, startDate || null)
                  setEditingTaskId(null)
                } else {
                  onCreate(title.trim(), Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [Number(assignedTo)] : []), brandId ? Number(brandId) : null, dueDate || null, startDate || null)
                }
                // reset controlled state and form
                setCreatorAssignedIds([])
                setShowAssignDropdown(false)
                try { form.reset() } catch (err) {}
            }}
          className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
          ref={formRef}
        >
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
            <input
              name="title"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="¿Qué hay que hacer?"
              required
            />
          </div>
          <div className="w-full md:w-48 min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
            <select
              name="brandId"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="">Sin marca</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-48 relative min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asignar a</label>
            <div>
              <button
                type="button"
                ref={assignButtonRef}
                onClick={() => setShowAssignDropdown(v => !v)}
                className="w-full text-left px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-between"
              >
                <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                  {creatorAssignedIds.length === 0 ? 'Nadie seleccionado' : `${creatorAssignedIds.length} seleccionado(s)`}
                </span>
                <span className="text-xs text-gray-500">▾</span>
              </button>

              {showAssignDropdown && (
                <div ref={assignDropdownRef} className="absolute z-50 mt-2 w-full max-h-48 overflow-auto border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-700 p-2 shadow">
                  {assignmentOptions.map(member => (
                    <label key={member.id} className="flex items-center gap-2 mb-1 px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-600 rounded">
                      <input
                        type="checkbox"
                        checked={creatorAssignedIds.includes(member.id)}
                        onChange={() => {
                          setCreatorAssignedIds(prev => {
                            if (prev.includes(member.id)) return prev.filter(id => id !== member.id)
                            return [...prev, member.id]
                          })
                        }}
                        className="mr-2"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{member.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="w-full md:w-40 min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inicio</label>
            <input
              name="startDate"
              type="date"
              defaultValue={monthFilter ? `${monthFilter}-01` : ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="w-full md:w-40 min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vencimiento</label>
            <input
              name="dueDate"
              type="date"
              defaultValue={monthFilter ? `${monthFilter}-01` : ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingTaskId ? 'Actualizar' : 'Crear'}
            </button>
            {editingTaskId && (
              <button
                type="button"
                onClick={() => {
                  setEditingTaskId(null)
                  const form = formRef.current
                  if (form) form.reset()
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Brand Filter */}
      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar por marca:</span>
        <div className="flex gap-2 items-center overflow-x-auto p-1">
          <button
            onClick={() => setBrandFilter('Todos')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              brandFilter === 'Todos' 
                ? 'bg-gray-800 dark:bg-gray-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Todas
          </button>
          {brands.map(brand => (
            <button
              key={brand.id}
              onClick={() => setBrandFilter(String(brand.id))}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                brandFilter === String(brand.id)
                  ? 'text-white ring-2 ring-offset-1 dark:ring-offset-gray-800'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              style={brandFilter === String(brand.id) ? { backgroundColor: brand.color, borderColor: brand.color } : {}}
            >
              <span className="w-2 h-2 rounded-full bg-current" style={{ color: brandFilter === String(brand.id) ? 'white' : brand.color }} />
              {brand.name}
            </button>
          ))}
        </div>
      </div>

      {/* Views */}
      {viewMode === 'calendar' ? (
        <TaskCalendar 
          tasks={filteredTasks.filter(t => brandFilter === 'Todos' || String(t.brandId) === brandFilter)} 
          startDate={monthFilter ? new Date(monthFilter + '-01T12:00:00') : undefined}
        />
      ) : viewMode === 'board' ? (
        <DndContext sensors={sensors} onDragEnd={(e) => { setActiveDragId(null); onDragEnd(e) }} onDragStart={(e) => {
            const id = String(e.active?.id || '')
            setActiveDragId(id)
            // no other side-effects here
        }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-x-auto pb-4">
            {(['pending', 'in_progress', 'completed'] as const).map(status => (
              <TaskBoardColumn
                key={status}
                status={status}
                tasks={filteredTasks.filter(t => 
                  t.status === status && 
                  (brandFilter === 'Todos' || String(t.brandId) === brandFilter)
                )}
                assignmentOptions={assignmentOptions}
                onDelete={onDelete}
                onUpdateStatus={onUpdateStatus}
                onAssign={onAssign}
                onCreateSubtask={onCreateSubtask}
                onUpdateSubtask={onUpdateSubtask}
                onDeleteSubtask={onDeleteSubtask}
              />
            ))}
          </div>
          {/* Drag overlay to show a stable preview while dragging */}
          {/* Rendered at the root of DndContext */}
          {/* eslint-disable-next-line @typescript-eslint/no-use-before-define */}
          <DragOverlay>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                assignmentOptions={assignmentOptions}
                onDelete={() => {}}
                onUpdateStatus={() => {}}
                onAssign={() => {}}
                isPreview
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="space-y-8">
          {(brandFilter === 'Todos' ? [...brands, { id: 0, name: 'Sin Marca', color: '#9ca3af' }] : brands.filter(b => String(b.id) === brandFilter)).map(brand => {
            const brandTasks = filteredTasks.filter(t => (t.brandId || 0) === brand.id)
            if (brandTasks.length === 0 && brandFilter === 'Todos') return null

            return (
              <div key={brand.id} className="space-y-3">
                <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }}></span>
                  {brand.name}
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {brandTasks.length}
                  </span>
                </h3>
                <div className="grid gap-3">
                  {brandTasks.map(task => (
                    <div key={task.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between hover:shadow-md dark:hover:border-gray-600 transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${
                          task.status === 'completed' ? 'bg-green-500 dark:bg-green-400' : 
                          task.status === 'in_progress' ? 'bg-blue-500 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-500'
                        }`} />
                        <div>
                          <p className={`font-medium ${task.status === 'completed' ? 'text-gray-500 line-through dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2 flex-wrap">
                            {((task as any).assignedToMembers && (task as any).assignedToMembers.length > 0 ? (task as any).assignedToMembers : (task.assignedToId ? [{ id: task.assignedToId, name: task.assignedToName || '', photoUrl: task.assignedToPhotoUrl }] : [])).map((m: any) => (
                              <span key={m.id} className="inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded text-[11px] max-w-[9rem] truncate">
                                <Avatar name={m.name} src={m.photoUrl} size={16} className="flex-shrink-0" />
                                <span className="truncate">{m.name}</span>
                              </span>
                            ))}
                            {task.dueDate && (
                              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                new Date(task.dueDate) < new Date() && task.status !== 'completed' 
                                  ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                                  : 'bg-gray-50 dark:bg-gray-700'
                              }`}>
                                📅 {formatDateUTC(task.dueDate)}
                              </span>
                            )}
                          </div>
                            {/* Subtasks (vista lista) */}
                            {Array.isArray((task as any).subtasks) && (task as any).subtasks.length > 0 && (
                              <ul className="mt-2 space-y-1 text-sm">
                                {(task as any).subtasks.map((s: any) => (
                                  <li key={s.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={s.status === 'completed'}
                                        onChange={async (e) => {
                                          const newStatus = e.currentTarget.checked ? 'completed' : 'pending'
                                          try { await onUpdateSubtask?.(s.id, { status: newStatus }) } catch (err) { console.error(err) }
                                        }}
                                        className="mr-1"
                                      />
                                      <span className={`${s.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-700 dark:text-white'}`}>{s.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={async () => {
                                          try { await onDeleteSubtask?.(s.id) } catch (err) { console.error(err) }
                                        }}
                                        className="text-red-400 hover:text-red-600 text-xs"
                                        title="Eliminar subtarea"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={task.status}
                          onChange={(e) => onUpdateStatus(task.id, e.target.value as Task['status'])}
                          className="text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 dark:text-white py-1 px-2"
                        >
                          <option value="pending">Pendiente</option>
                          <option value="in_progress">En Progreso</option>
                          <option value="completed">Completada</option>
                        </select>
                        <button 
                          onClick={() => startEdit(task)}
                          className="text-gray-500 hover:text-blue-600 p-1"
                          title="Editar tarea"
                        >
                          ✎
                        </button>
                        {showNewSubtaskFor === task.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={newSubtaskTexts[task.id] || ''}
                              onChange={(e) => setNewSubtaskTexts(prev => ({ ...prev, [task.id]: e.currentTarget.value }))}
                              placeholder="Título de la subtarea"
                              className="text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 dark:text-white"
                            />
                            <button
                              onClick={async () => {
                                const val = (newSubtaskTexts[task.id] || '').trim()
                                if (!val) return
                                try {
                                  if (typeof onCreateSubtask === 'function') {
                                    await onCreateSubtask(task.id, val)
                                  } else {
                                    alert('Función de crear subtarea no disponible')
                                  }
                                } catch (err) {
                                  console.error(err)
                                  alert('Error creando subtarea')
                                }
                                setNewSubtaskTexts(prev => { const copy = { ...prev }; delete copy[task.id]; return copy })
                                setShowNewSubtaskFor(null)
                              }}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="Guardar subtarea"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => { setShowNewSubtaskFor(null); setNewSubtaskTexts(prev => { const copy = { ...prev }; delete copy[task.id]; return copy }) }}
                              className="text-gray-400 hover:text-gray-600 p-1"
                              title="Cancelar"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowNewSubtaskFor(task.id)}
                            className="text-gray-500 hover:text-green-600 p-1"
                            title="Añadir subtarea"
                          >
                            ＋
                          </button>
                        )}
                        <button 
                          onClick={() => onDelete(task.id)}
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
