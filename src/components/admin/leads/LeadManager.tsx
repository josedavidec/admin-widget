import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { BoardColumn } from './BoardColumn'
import { MetricCard } from '../MetricCard'
import { 
  type Lead, 
  type LeadStatus, 
  type StatusFilter, 
  type AssignedFilter, 
  type ServiceFilter, 
  STATUS_OPTIONS 
} from '../../../types/admin'
import { formatDate, leadNeedsAttention } from '../../../utils/adminUtils'

type LeadManagerProps = {
  leads: Lead[]
  filteredLeads: Lead[]
  loading: boolean
  viewMode: 'table' | 'board'
  setViewMode: (mode: 'table' | 'board') => void
  statusFilter: StatusFilter
  setStatusFilter: (filter: StatusFilter) => void
  assignedFilter: AssignedFilter
  setAssignedFilter: (filter: AssignedFilter) => void
  serviceFilter: ServiceFilter
  setServiceFilter: (filter: ServiceFilter) => void
  tagFilter: string
  setTagFilter: (filter: string) => void
  showAttentionOnly: boolean
  setShowAttentionOnly: (show: boolean) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  assignmentOptions: string[]
  serviceOptions: string[]
  tagOptions: string[]
  metrics: {
    totalLeads: number
    leadsThisWeek: number
    converted: number
    conversionRate: number
    needingFollowUp: number
    unassigned: number
    contactsThisWeek: number
  }
  onStatusChange: (id: number, status: LeadStatus) => void
  onAssignmentChange: (id: number, assignedTo: string) => void
  onMarkContact: (id: number) => void
  onDelete: (id: number) => void
  onOpenNotes: (id: number) => void
  onDragEnd: (event: DragEndEvent) => void
  onRefresh: () => void
  onExportCSV: () => void
}

export function LeadManager({
  filteredLeads,
  loading,
  viewMode,
  setViewMode,
  statusFilter,
  setStatusFilter,
  assignedFilter,
  setAssignedFilter,
  serviceFilter,
  setServiceFilter,
  tagFilter,
  setTagFilter,
  showAttentionOnly,
  setShowAttentionOnly,
  searchTerm,
  setSearchTerm,
  assignmentOptions,
  serviceOptions,
  tagOptions,
  metrics,
  onStatusChange,
  onAssignmentChange,
  onMarkContact,
  onDelete,
  onOpenNotes,
  onDragEnd,
  onRefresh,
  onExportCSV
}: LeadManagerProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const ATTENTION_THRESHOLD_DAYS = 3

  const getEmails = (leads: Lead[]) => leads.map((l) => l.email).filter(Boolean).join(',')
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Correos copiados al portapapeles')
  }

  return (
    <div className="space-y-8">
      {/* Header Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Panel de Leads</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gestiona contactos, notas internas y métricas clave en tiempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
            >
              Vista tabla
            </button>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 transition-colors ${viewMode === 'board' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
            >
              Vista Kanban
            </button>
          </div>
          <button
            onClick={() => onRefresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-60"
          >
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" aria-hidden />
            Actualizar
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <MetricCard label="Leads totales" value={metrics.totalLeads.toString()} />
        <MetricCard label="Leads últimos 7 días" value={metrics.leadsThisWeek.toString()} />
        <MetricCard label="Convertidos" value={metrics.converted.toString()} sublabel="Basado en estado 'Convertido'" />
        <MetricCard label="Tasa de conversión" value={`${metrics.conversionRate.toFixed(1)}%`} sublabel="Convertidos / Leads totales" />
        <MetricCard
          label="Seguimientos pendientes"
          value={metrics.needingFollowUp.toString()}
          sublabel={`Más de ${ATTENTION_THRESHOLD_DAYS} días sin contacto`}
        />
        <MetricCard label="Sin responsable" value={metrics.unassigned.toString()} sublabel="Leads sin asignación" />
        <MetricCard label="Contactos semana" value={metrics.contactsThisWeek.toString()} sublabel="Últimos 7 días" />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-xl p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full md:w-64 lg:w-72 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                placeholder="Buscar por nombre, correo, empresa..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
            >
              <option value="Todos">Todos los estados</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={serviceFilter}
              onChange={(event) => setServiceFilter(event.target.value as ServiceFilter)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
            >
              <option value="Todos">Todos los servicios</option>
              {serviceOptions.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>

            <select
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
            >
              <option value="Todos">Todas las etiquetas</option>
              {tagOptions.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>

            <select
              value={assignedFilter}
              onChange={(event) => setAssignedFilter(event.target.value as AssignedFilter)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
            >
              <option value="Todos">Todos los responsables</option>
              <option value="Sin asignar">Sin asignar</option>
              {assignmentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <input
                type="checkbox"
                checked={showAttentionOnly}
                onChange={(event) => setShowAttentionOnly(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Solo pendientes de seguimiento
            </label>

            <button
              onClick={() => copyToClipboard(getEmails(filteredLeads))}
              className="inline-flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
              Copiar correos
            </button>
            <a
              href={`mailto:?bcc=${getEmails(filteredLeads)}`}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              Redactar a todos
            </a>
          </div>

          <button
            onClick={onExportCSV}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h16"/><path d="M7 10v4"/><path d="M12 4v10"/><path d="M17 7v7"/><path d="M7 14l-3-3 3-3"/><path d="m17 14 3-3-3-3"/>
            </svg>
            Exportar CSV
          </button>
        </div>

        {/* Content */}
        {viewMode === 'board' ? (
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="flex h-full gap-4 overflow-x-auto pb-4">
              {STATUS_OPTIONS.map((status) => (
                <BoardColumn
                  key={status}
                  status={status}
                  leads={filteredLeads.filter((lead) => lead.status === status)}
                  onOpenNotes={onOpenNotes}
                  onCopyEmail={copyToClipboard}
                  onMarkContact={onMarkContact}
                  onDeleteLead={onDelete}
                />
              ))}
            </div>
          </DndContext>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-gray-600 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold">
                  <tr>
                    <th className="px-5 py-4">Fecha</th>
                    <th className="px-5 py-4">Nombre</th>
                    <th className="px-5 py-4">Contacto</th>
                    <th className="px-5 py-4">Teléfono</th>
                    <th className="px-5 py-4">Empresa</th>
                    <th className="px-5 py-4">Servicios</th>
                    <th className="px-5 py-4">Presupuesto</th>
                    <th className="px-5 py-4">Asignado a</th>
                    <th className="px-5 py-4">Último contacto</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4">Notas</th>
                    <th className="px-5 py-4">Mensaje</th>
                    <th className="px-5 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {filteredLeads.map((lead) => {
                    const attention = leadNeedsAttention(lead)
                    const relativeContact = lead.lastContactAt ? formatDate(lead.lastContactAt) : 'Nunca'

                    return (
                      <tr key={lead.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${attention ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                        <td className="px-5 py-4 whitespace-nowrap">{formatDate(lead.created_at)}</td>
                        <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">{lead.name}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <a href={`mailto:${lead.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                              {lead.email}
                            </a>
                            <button
                              onClick={() => copyToClipboard(lead.email)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="Copiar correo"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4">{lead.phone || '-'}</td>
                        <td className="px-5 py-4">{lead.company || '-'}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {lead.services.length === 0 ? (
                              <span className="text-xs text-gray-400">Sin datos</span>
                            ) : (
                              lead.services.map((service) => (
                                <span key={service} className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300">
                                  {service}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">{lead.budget_range || '-'}</td>
                        <td className="px-5 py-4">
                          <select
                            value={lead.assignedTo || ''}
                            onChange={(event) => onAssignmentChange(lead.id, event.target.value)}
                            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-800 dark:text-white"
                          >
                            <option value="">Sin asignar</option>
                            {assignmentOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                            <option value="__custom__">Agregar responsable…</option>
                          </select>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className={`${attention ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}
                              title={lead.lastContactAt ? formatDate(lead.lastContactAt) : 'Sin registros'}
                            >
                              {relativeContact}
                            </span>
                            <button
                              type="button"
                              onClick={() => onMarkContact(lead.id)}
                              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                            >
                              Registrar
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <select
                            value={lead.status}
                            onChange={(event) => onStatusChange(lead.id, event.target.value as LeadStatus)}
                            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200 dark:focus:ring-blue-800 dark:text-white"
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => onOpenNotes(lead.id)}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                          >
                            {lead.note ? 'Ver nota' : 'Agregar nota'}
                          </button>
                        </td>
                        <td className="px-5 py-4 max-w-xs truncate" title={lead.message}>
                          {lead.message || '-'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => onDelete(lead.id)}
                            className="text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredLeads.length === 0 && (
                    <tr>
                      <td colSpan={13} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        No hay leads para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {loading && <p className="px-5 pb-5 text-sm text-gray-400">Cargando leads...</p>}
          </div>
        )}
      </div>
    </div>
  )
}
