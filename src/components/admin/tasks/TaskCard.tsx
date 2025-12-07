import { type CSSProperties } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { type Task, type TeamMember } from '../../../types/admin'
import { formatDateUTC } from '../../../utils/adminUtils'

type TaskCardProps = {
  task: Task
  assignmentOptions: TeamMember[]
  onDelete: (taskId: number) => void
  onUpdateStatus: (taskId: number, status: Task['status']) => void
  onAssign: (taskId: number, memberId: number | null) => void
}

export function TaskCard({ task, assignmentOptions, onDelete, onUpdateStatus, onAssign }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `task-${task.id}`, data: { type: 'task', task } })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : 'transform 150ms ease',
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 group cursor-grab ${isDragging ? 'ring-2 ring-blue-200 dark:ring-blue-800' : 'hover:shadow-md dark:hover:border-gray-600'}`}
      {...listeners}
      {...attributes}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          {task.brandName && (
            <span 
              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mb-1"
              style={{ 
                backgroundColor: (task.brandColor || '#e5e7eb') + '30', 
                color: task.brandColor || '#374151' 
              }}
            >
              {task.brandName}
            </span>
          )}
          <p className="font-medium text-gray-900 dark:text-white text-sm">{task.title}</p>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation()
            onDelete(task.id)
          }}
          className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
          onPointerDown={(e) => e.stopPropagation()}
        >
          ×
        </button>
      </div>
      
      <div className="flex flex-col gap-2 mt-3">
        <div className="relative">
          {task.assignedToId && (
            <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              {(() => {
                const assignedMember = assignmentOptions.find(m => m.id === task.assignedToId)
                if (assignedMember?.photoUrl) {
                  return <img src={assignedMember.photoUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                }
                return <span className="text-[10px]">👤</span>
              })()}
            </div>
          )}
          <select
            value={task.assignedToId || ''}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null
              onAssign(task.id, val)
            }}
            className={`text-xs border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-700 dark:text-white py-1 w-full ${task.assignedToId ? 'pl-7 pr-2' : 'px-2'}`}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <option value="">Sin asignar</option>
            {assignmentOptions.map(member => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </div>

        <select
          value={task.status}
          onChange={(e) => onUpdateStatus(task.id, e.target.value as Task['status'])}
          className={`text-xs border-none rounded py-1 px-2 w-full font-medium ${
            task.status === 'completed' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
            task.status === 'in_progress' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
            'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <option value="pending">Pendiente</option>
          <option value="in_progress">En Progreso</option>
          <option value="completed">Completada</option>
        </select>
      </div>
      
      <div className="mt-2 flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-500">
        <span>
          {task.dueDate ? `Vence: ${formatDateUTC(task.dueDate)}` : ''}
        </span>
        <span>{new Date(task.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  )
}
