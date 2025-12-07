import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { TaskBoardColumn } from './TaskBoardColumn'
import { TaskCalendar } from './TaskCalendar'
import { type Task, type TeamMember, type Brand } from '../../../types/admin'
import { formatDateUTC } from '../../../utils/adminUtils'

type TaskManagerProps = {
  tasks: Task[]
  brands: Brand[]
  assignmentOptions: TeamMember[]
  viewMode: 'list' | 'board' | 'calendar'
  setViewMode: (mode: 'list' | 'board' | 'calendar') => void
  monthFilter: string
  setMonthFilter: (month: string) => void
  filteredTasks: Task[]
  onCreate: (title: string, assignedToId: number | null, brandId: number | null, dueDate: string | null, startDate: string | null) => void
  onUpdateStatus: (id: number, status: Task['status']) => void
  onAssign: (taskId: number, assignedToId: number | null) => void
  onDelete: (id: number) => void
  onDragEnd: (event: DragEndEvent) => void
  brandFilter: string
  setBrandFilter: (filter: string) => void
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
  brandFilter,
  setBrandFilter
}: TaskManagerProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gestión de Tareas</h2>
          <div className="flex overflow-hidden rounded-lg border border-gray-300 bg-white text-sm font-medium shadow-sm">
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
        </div>
      </div>

      {/* Create Task Form */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Nueva Tarea</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.currentTarget
            const title = (form.elements.namedItem('title') as HTMLInputElement).value
            const assignedTo = (form.elements.namedItem('assignedTo') as HTMLSelectElement).value
            const brandId = (form.elements.namedItem('brandId') as HTMLSelectElement).value
            const dueDate = (form.elements.namedItem('dueDate') as HTMLInputElement).value
            const startDate = (form.elements.namedItem('startDate') as HTMLInputElement).value
            
            if (title.trim()) {
              onCreate(
                title.trim(), 
                assignedTo ? Number(assignedTo) : null, 
                brandId ? Number(brandId) : null,
                dueDate || null,
                startDate || null
              )
              form.reset()
            }
          }}
          className="flex flex-col gap-4 md:flex-row md:items-end"
        >
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
            <input
              name="title"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="¿Qué hay que hacer?"
              required
            />
          </div>
          <div className="w-full md:w-48">
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
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asignar a</label>
            <select
              name="assignedTo"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="">Sin asignar</option>
              {assignmentOptions.map(member => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-40">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inicio</label>
            <input
              name="startDate"
              type="date"
              defaultValue={monthFilter ? `${monthFilter}-01` : ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="w-full md:w-40">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vencimiento</label>
            <input
              name="dueDate"
              type="date"
              defaultValue={monthFilter ? `${monthFilter}-01` : ''}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Crear
          </button>
        </form>
      </div>

      {/* Brand Filter */}
      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar por marca:</span>
        <div className="flex gap-2 overflow-x-auto pb-1">
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
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
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
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <div className="space-y-8">
          {(brandFilter === 'Todos' ? [...brands, { id: 0, name: 'Sin Marca', color: '#9ca3af' }] : brands.filter(b => String(b.id) === brandFilter)).map(brand => {
            const brandTasks = filteredTasks.filter(t => (t.brandId || 0) === brand.id)
            if (brandTasks.length === 0 && brandFilter === 'Todos') return null

            return (
              <div key={brand.id} className="space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }}></span>
                  {brand.name}
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {brandTasks.length}
                  </span>
                </h3>
                <div className="grid gap-3">
                  {brandTasks.map(task => (
                    <div key={task.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${
                          task.status === 'completed' ? 'bg-green-500' : 
                          task.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
                        }`} />
                        <div>
                          <p className={`font-medium ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            {task.assignedToName && (
                              <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded">
                                {task.assignedToPhotoUrl ? (
                                  <img src={task.assignedToPhotoUrl} alt={task.assignedToName} className="w-4 h-4 rounded-full object-cover" />
                                ) : (
                                  <span>👤</span>
                                )}
                                {task.assignedToName}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                new Date(task.dueDate) < new Date() && task.status !== 'completed' 
                                  ? 'bg-red-50 text-red-600' 
                                  : 'bg-gray-50'
                              }`}>
                                📅 {formatDateUTC(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={task.status}
                          onChange={(e) => onUpdateStatus(task.id, e.target.value as Task['status'])}
                          className="text-xs border-gray-200 rounded bg-gray-50 py-1 px-2"
                        >
                          <option value="pending">Pendiente</option>
                          <option value="in_progress">En Progreso</option>
                          <option value="completed">Completada</option>
                        </select>
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
