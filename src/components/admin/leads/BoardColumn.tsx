import { useDroppable } from '@dnd-kit/core'
import { type Lead, type LeadStatus, STATUS_STYLES } from '../../../types/admin'
import { BoardCard } from './BoardCard'

type BoardColumnProps = {
  status: LeadStatus
  leads: Lead[]
  onOpenNotes: (leadId: number) => void
  onCopyEmail: (value: string) => void
  onMarkContact: (leadId: number) => void
  onDeleteLead: (leadId: number) => void
}

export function BoardColumn({ status, leads, onOpenNotes, onCopyEmail, onMarkContact, onDeleteLead }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[260px] flex-1 flex-col rounded-xl border bg-gray-50 dark:bg-gray-800/50 transition-colors ${
        isOver ? 'border-blue-300 bg-blue-50/60 dark:bg-blue-900/20 dark:border-blue-700' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
          {status}
        </span>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{leads.length}</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {leads.map((lead) => (
          <BoardCard
            key={lead.id}
            lead={lead}
            onOpenNotes={onOpenNotes}
            onCopyEmail={onCopyEmail}
            onMarkContact={onMarkContact}
            onDeleteLead={onDeleteLead}
          />
        ))}
      </div>
    </div>
  )
}
