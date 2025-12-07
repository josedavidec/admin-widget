import { useDroppable } from '@dnd-kit/core'
import { type Task, type TaskStatus, type TeamMember } from '../../../types/admin'
import { TaskCard } from './TaskCard'

type TaskBoardColumnProps = {
  status: TaskStatus
  tasks: Task[]
  assignmentOptions: TeamMember[]
  onDelete: (taskId: number) => void
  onUpdateStatus: (taskId: number, status: Task['status']) => void
  onAssign: (taskId: number, memberId: number | null) => void
}

export function TaskBoardColumn({ status, tasks, assignmentOptions, onDelete, onUpdateStatus, onAssign }: TaskBoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}`, data: { type: 'column', status } })

  return (
    <div 
      ref={setNodeRef}
      className={`bg-gray-100 dark:bg-gray-800/50 rounded-xl p-4 transition-colors ${isOver ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800' : ''}`}
    >
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center justify-between">
        {status === 'pending' ? 'Pendientes' : status === 'in_progress' ? 'En Progreso' : 'Completadas'}
        <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs">
          {tasks.length}
        </span>
      </h3>
      <div className="space-y-3 min-h-[100px]">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            assignmentOptions={assignmentOptions}
            onDelete={onDelete}
            onUpdateStatus={onUpdateStatus}
            onAssign={onAssign}
          />
        ))}
      </div>
    </div>
  )
}
