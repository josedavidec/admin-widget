import { type CSSProperties } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { type Lead } from '../../../types/admin'
import { formatDate, formatRelativeFromNow, leadNeedsAttention } from '../../../utils/adminUtils'

type BoardCardProps = {
  lead: Lead
  onOpenNotes: (leadId: number) => void
  onCopyEmail: (value: string) => void
  onMarkContact: (leadId: number) => void
  onDeleteLead: (leadId: number) => void
}

export function BoardCard({ lead, onOpenNotes, onCopyEmail, onMarkContact, onDeleteLead }: BoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id })
  const attention = leadNeedsAttention(lead)
  const relativeContact = lead.lastContactAt ? formatRelativeFromNow(lead.lastContactAt) : 'Sin contacto'

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : 'transform 150ms ease',
    zIndex: isDragging ? 50 : 'auto',
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`group cursor-grab rounded-lg border bg-white dark:bg-gray-800 p-3 shadow-sm transition-all ${
        isDragging
          ? 'border-blue-300 shadow-lg ring-2 ring-blue-200 dark:border-blue-500 dark:ring-blue-900'
          : attention
            ? 'border-amber-300 shadow-md ring-1 ring-amber-200 dark:border-amber-500 dark:ring-amber-900'
            : 'border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:border-gray-600'
      }`}
      {...listeners}
      {...attributes}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{lead.name}</p>
          <button
            type="button"
            onClick={() => onCopyEmail(lead.email)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            {lead.email}
          </button>
        </div>
        {lead.note && (
          <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            Nota
          </span>
        )}
      </header>

      <div className="mt-2 space-y-2 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            {lead.company || 'Sin empresa'}
          </span>
          <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:text-gray-300">
            {lead.budget_range || 'Sin presupuesto'}
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {lead.services.length === 0 ? (
            <span className="rounded border border-dashed border-gray-300 dark:border-gray-600 px-2 py-0.5 text-[10px] text-gray-500 dark:text-gray-400">
              Sin servicios
            </span>
          ) : (
            lead.services.slice(0, 3).map((service) => (
              <span key={service} className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[10px] text-gray-700 dark:text-gray-300">
                {service}
              </span>
            ))
          )}
          {lead.services.length > 3 && (
            <span className="rounded-full bg-gray-200 dark:bg-gray-600 px-2 py-0.5 text-[10px] text-gray-700 dark:text-gray-300">
              +{lead.services.length - 3}
            </span>
          )}
        </div>

        {lead.tags && lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lead.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 text-[9px] font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {lead.message && (
          <p className="max-h-20 overflow-hidden text-ellipsis text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
            {lead.message}
          </p>
        )}

        <div className="flex items-center justify-between text-[11px]">
          <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {lead.assignedTo || 'Sin responsable'}
          </span>
          <span className={`${attention ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>{relativeContact}</span>
        </div>
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
        <span>{formatDate(lead.created_at)}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMarkContact(lead.id)}
            className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            Registrar contacto
          </button>
          <button
            type="button"
            onClick={() => onOpenNotes(lead.id)}
            className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            {lead.note || (lead.tags && lead.tags.length > 0) ? 'Editar nota / Tags' : 'Agregar nota / Tags'}
          </button>
          <button
            type="button"
            onClick={() => onDeleteLead(lead.id)}
            className="font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            Eliminar
          </button>
        </div>
      </footer>
    </article>
  )
}
