import { type CSSProperties, useState, useRef, useEffect } from 'react'
import { useDraggable, DndContext } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { useSortable, SortableContext, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type Task, type TeamMember } from '../../../types/admin'
import { formatDateUTC } from '../../../utils/adminUtils'

type TaskCardProps = {
  task: Task
  assignmentOptions: TeamMember[]
  onDelete: (taskId: number) => void
  onUpdateStatus: (taskId: number, status: Task['status']) => void
  onAssign: (taskId: number, memberIds: number[] | null) => void
  onCreateSubtask?: (taskId: number, title: string) => Promise<any> | null
  onUpdateSubtask?: (subtaskId: number, payload: Partial<{ title: string; status: string }>) => Promise<any> | null
  onDeleteSubtask?: (subtaskId: number) => Promise<boolean> | null
}

export function TaskCard({ task, assignmentOptions, onDelete, onUpdateStatus, onAssign, onCreateSubtask, onUpdateSubtask, onDeleteSubtask }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `task-${task.id}`, data: { type: 'task', task } })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : 'transform 150ms ease',
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  }

  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const newSubtaskRef = useRef<HTMLInputElement | null>(null)
  const [newSubtaskText, setNewSubtaskText] = useState('')
  const [localSubtasks, setLocalSubtasks] = useState<any[]>((task as any).subtasks || [])

  useEffect(() => {
    setLocalSubtasks((task as any).subtasks || [])
  }, [task.subtasks])

  const startEditing = (s: any) => {
    setEditingSubtaskId(s.id)
    setEditingValue(s.title || '')
  }

  const finishEditing = async (id: number) => {
    if (editingValue.trim() === '') {
      setEditingSubtaskId(null)
      setEditingValue('')
      return
    }
    try {
      await (onUpdateSubtask as any)?.(id, { title: editingValue.trim() })
    } catch (err) {
      console.error(err)
    }
    setEditingSubtaskId(null)
    setEditingValue('')
  }

  const moveSubtaskUp = async (idx: number) => {
    const subs = localSubtasks || []
    if (idx <= 0 || idx >= subs.length) return
    const a = subs[idx]
    const b = subs[idx - 1]
    const posA = a.position ?? idx
    const posB = b.position ?? (idx - 1)
    try {
      await (onUpdateSubtask as any)?.(a.id, { position: posB })
      await (onUpdateSubtask as any)?.(b.id, { position: posA })
      // optimistic local swap
      setLocalSubtasks(prev => {
        const copy = [...prev]
        copy.splice(idx - 1, 2, prev[idx], prev[idx - 1])
        return copy
      })
    } catch (err) {
      console.error(err)
    }
  }

  const moveSubtaskDown = async (idx: number) => {
    const subs = localSubtasks || []
    if (idx < 0 || idx >= subs.length - 1) return
    const a = subs[idx]
    const b = subs[idx + 1]
    const posA = a.position ?? idx
    const posB = b.position ?? (idx + 1)
    try {
      await (onUpdateSubtask as any)?.(a.id, { position: posB })
      await (onUpdateSubtask as any)?.(b.id, { position: posA })
      setLocalSubtasks(prev => {
        const copy = [...prev]
        copy.splice(idx, 2, prev[idx + 1], prev[idx])
        return copy
      })
    } catch (err) {
      console.error(err)
    }
  }

  // DnD handlers for subtasks using @dnd-kit/sortable
  const handleSubtaskDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const activeId = Number(active.id)
    const overId = Number(over.id)
    const oldIndex = localSubtasks.findIndex(s => s.id === activeId)
    const newIndex = localSubtasks.findIndex(s => s.id === overId)
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    const newOrder = arrayMove(localSubtasks, oldIndex, newIndex)
    setLocalSubtasks(newOrder)

    // persist new positions (1-based)
    try {
      for (let i = 0; i < newOrder.length; i++) {
        const s = newOrder[i]
        await (onUpdateSubtask as any)?.(s.id, { position: i + 1 })
      }
    } catch (err) {
      console.error('Error saving subtask order', err)
    }
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
          <div className="flex items-center gap-2">
            {/* show avatars for multiple assignees */}
            <div className="flex -space-x-2">
              {((task.assignedToMembers && task.assignedToMembers.length > 0) ? task.assignedToMembers : (task.assignedToId ? [{ id: task.assignedToId, name: task.assignedToName || '', photoUrl: task.assignedToPhotoUrl }] : [])).map(member => (
                <div key={member.id} className="w-6 h-6 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 bg-gray-200">
                  {member.photoUrl ? <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" /> : <span className="text-[10px] block text-center">👤</span>}
                </div>
              ))}
            </div>

            <select
              multiple
              size={Math.min(4, Math.max(2, assignmentOptions.length))}
              onChange={(e) => {
                const selected = Array.from(e.currentTarget.selectedOptions).map(o => Number(o.value))
                onAssign(task.id, selected.length ? selected : null)
              }}
              className={`text-xs border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-700 dark:text-white py-1 w-full`}
              onPointerDown={(e) => e.stopPropagation()}
              value={((task.assignedToIds && task.assignedToIds.length > 0) ? task.assignedToIds.map(String) : (task.assignedToId ? [String(task.assignedToId)] : []))}
            >
              <option value="">Sin asignar</option>
              {assignmentOptions.map(member => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>
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
      
      {/* Subtasks */}
      <div className="mt-3">
        {localSubtasks.length > 0 && (
          <DndContext onDragEnd={handleSubtaskDragEnd}>
            <SortableContext items={localSubtasks.map(s => s.id)}>
              <ul className="space-y-1 text-sm">
                {localSubtasks.map((s: any, idx: number) => (
                  <SubtaskRow key={s.id} s={s} idx={idx} onUpdateSubtask={onUpdateSubtask} onDeleteSubtask={onDeleteSubtask} editingSubtaskId={editingSubtaskId} startEditing={startEditing} editingValue={editingValue} setEditingValue={setEditingValue} finishEditing={finishEditing} moveUp={() => moveSubtaskUp(idx)} moveDown={() => moveSubtaskDown(idx)} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        <div className="mt-2 flex gap-2">
          <input ref={newSubtaskRef} placeholder="Agregar subtarea" value={newSubtaskText} onChange={(e) => setNewSubtaskText(e.target.value)} className="flex-1 text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 dark:text-white" />
          <button
            onClick={async () => {
              const val = newSubtaskText?.trim()
              if (!val) return
              await (onCreateSubtask as any)?.(task.id, val)
              setNewSubtaskText('')
            }}
            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-sm rounded"
          >
            +
          </button>
        </div>
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

function SubtaskRow({ s, idx, onUpdateSubtask, onDeleteSubtask, editingSubtaskId, startEditing, editingValue, setEditingValue, finishEditing, moveUp, moveDown }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={s.status === 'completed'}
          onChange={(e) => {
            const newStatus = e.currentTarget.checked ? 'completed' : 'pending'
            try { onUpdateSubtask?.(s.id, { status: newStatus }) } catch (err) { console.error(err) }
          }}
          className="mr-1"
        />
        {editingSubtaskId === s.id ? (
          <input
            autoFocus
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={() => finishEditing(s.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') finishEditing(s.id) }}
            className="text-sm px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 dark:text-white"
          />
        ) : (
          <button onClick={() => startEditing(s)} className={`text-left text-xs ${s.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-700 dark:text-white'}`} {...attributes} {...listeners}>
            {s.title}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={moveUp} className="text-xs px-1" title="Subir">↑</button>
        <button onClick={moveDown} className="text-xs px-1" title="Bajar">↓</button>
        <button onClick={() => onDeleteSubtask?.(s.id)} className="text-red-400 hover:text-red-600 text-xs" title="Eliminar">✕</button>
      </div>
    </li>
  )
}
