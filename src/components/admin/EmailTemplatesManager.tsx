import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import MediaLibrary from './MediaLibrary'
import type { QuillEditorHandle } from './QuillEditor'
const QuillEditor = lazy(() => import('./QuillEditor'))

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

type Props = {
  emailTemplates?: EmailTemplate[]
  emailLoading?: boolean
  fetchEmailTemplates?: () => Promise<void>
  createEmailTemplate?: (p: Partial<EmailTemplate>) => Promise<EmailTemplate | null>
  updateEmailTemplate?: (id: number, p: Partial<EmailTemplate>) => Promise<boolean>
  deleteEmailTemplate?: (id: number) => Promise<boolean>
  sendEmail?: (p: { to: string; templateId?: number; subject?: string; body?: string; variables?: Record<string, unknown> }) => Promise<boolean>
  scheduleEmail?: (p: { to: string; templateId?: number; subject?: string; body?: string; variables?: Record<string, unknown>; sendAt: string }) => Promise<boolean>
}

export default function EmailTemplatesManager({
  emailTemplates = [],
  emailLoading = false,
  fetchEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  sendEmail,
  scheduleEmail,
}: Props) {

  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')
  const [showMedia, setShowMedia] = useState(false)
  const editorRef = useRef<QuillEditorHandle | null>(null)
  // Use templates provided by server (no defaults)
  const templatesToShow = emailTemplates

  // Lead filter UI state (applies per-template preview/send)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>('')
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [filterIds, setFilterIds] = useState<string>('')
  const [previewResults, setPreviewResults] = useState<Record<string, Array<any>>>({})
  const PREVIEW_LIMIT = 2
  const [sending, setSending] = useState(false)
  const [scheduling, setScheduling] = useState(false)

  // Options loaded from server for selects
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [assignedOptions, setAssignedOptions] = useState<string[]>([])
  const [tagOptions, setTagOptions] = useState<string[]>([])

  useEffect(() => {
    if (fetchEmailTemplates) void fetchEmailTemplates()

    const loadFilters = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        const res = await fetch('/api/email/filters', { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
        if (!res.ok) return
        const data = await res.json()
        setStatusOptions(data.statuses || [])
        setAssignedOptions(data.assignedTo || [])
        setTagOptions(data.tags || [])
      } catch (err) {
        console.error('Failed to load email filter options', err)
      }
    }

    void loadFilters()
  }, [fetchEmailTemplates])

  // QuillEditor is used directly (react-quilljs wrapper)

  const handleSave = async () => {
    if (!editing) return
    if (editing.id) {
      if (updateEmailTemplate) await updateEmailTemplate(editing.id, editing)
    } else {
      if (createEmailTemplate) await createEmailTemplate(editing)
    }
    setEditing(null)
    setShowNew(false)
    if (fetchEmailTemplates) await fetchEmailTemplates()
  }

  const handleSendTest = async (template: EmailTemplate) => {
    if (!testEmail) return alert('Ingresa un correo de prueba')
    if (sendEmail) {
      if (template.id) {
        await sendEmail({ to: testEmail, templateId: template.id })
      } else {
        await sendEmail({ to: testEmail, subject: template.subject, body: template.body })
      }
    }
    alert('Enviado (o registrado en logs si SMTP no configurado)')
  }

  const handleSchedule = async (template: EmailTemplate) => {
    if (!scheduleAt) return alert('Selecciona fecha/hora')
    if (scheduleEmail) {
      if (template.id) {
        await scheduleEmail({ to: testEmail || '', templateId: template.id, sendAt: scheduleAt })
      } else {
        await scheduleEmail({ to: testEmail || '', subject: template.subject, body: template.body, sendAt: scheduleAt })
      }
    }
    alert('Programado')
  }

  const extractPlaceholders = (html?: string) => {
    if (!html) return [] as string[]
    const matches = html.match(/{{\s*([^}]+?)\s*}}/g) || []
    return Array.from(new Set(matches.map((m) => m.replace(/{{\s*|\s*}}/g, ''))))
  }

  // Common lead fields available for templates
  const leadVariables = [
    'id',
    'name',
    'email',
    'phone',
    'company',
    'services',
    'budget_range',
    'message',
    'status',
    'assigned_to',
    'tags',
    'note',
    'last_contact_at',
    'created_at',
    'updated_at',
  ]

  return (
    <section className="py-12">
      <div className="max-w-6xl mx-auto px-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Plantillas de Email</h3>
        <div>
          <button onClick={() => { setShowNew(true); setEditing({ name: '', subject: '', body: '' }) }} className="px-3 py-1 bg-blue-600 text-white rounded">Nueva</button>
        </div>
      </div>

        <div>
          <label className="block text-sm text-gray-700 dark:text-white">Correo de prueba</label>
          <div className="flex gap-2">
            <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded mt-1 bg-white dark:bg-black/40 text-gray-800 dark:text-white" />
            <button onClick={() => { if (fetchEmailTemplates) void fetchEmailTemplates() }} className="px-3 py-2 border border-gray-200 dark:border-white/10 rounded mt-1 text-gray-800 dark:text-white">Recargar</button>
          </div>
        </div>

      {emailLoading ? (
        <div>Cargando plantillas...</div>
      ) : (
        <div className="space-y-3">
          {templatesToShow.map((t: EmailTemplate) => (
            <div key={t.id ?? t.name} className="bg-white dark:bg-black/40 rounded-lg p-6 border border-gray-100 dark:border-white/10">
              <div className="flex justify-between items-start">
                <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{t.name}</div>
                    <div className="text-sm text-gray-600 dark:text-white/70 mt-1">{t.subject}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(t); setShowNew(true) }} className="px-3 py-1 text-sm rounded-md border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5">Editar</button>
                  {t.id ? (
                    <button onClick={() => { if (confirm('Eliminar plantilla?')) { if (deleteEmailTemplate && t.id) { void deleteEmailTemplate(t.id) } } }} className="px-3 py-1 text-sm rounded-md border border-red-200 dark:border-red-600/30 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-600/10">Eliminar</button>
                  ) : (
                    <>
                      <button onClick={async () => { setEditing(t); setShowNew(true) }} className="px-3 py-1 text-sm rounded-md border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5">Usar / Guardar</button>
                      <button onClick={async () => { if (createEmailTemplate) { await createEmailTemplate(t); if (fetchEmailTemplates) await fetchEmailTemplates() } }} className="px-3 py-1 text-sm rounded-md bg-indigo-600 text-white shadow-sm hover:bg-indigo-700">Guardar</button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <div className="prose max-w-none text-gray-800 dark:prose-invert dark:text-white" dangerouslySetInnerHTML={{ __html: t.body || '' }} />
              </div>

              <div className="mt-3">
                <div className="mt-2 mb-2 text-sm font-medium">Enviar a leads (filtro)</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-black/40 text-gray-800 dark:text-white text-sm">
                    <option value="">Estado — (todos)</option>
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <select value={filterAssignedTo} onChange={e => setFilterAssignedTo(e.target.value)} className="px-3 py-2 border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-black/40 text-gray-800 dark:text-white text-sm">
                    <option value="">Responsable — (todos)</option>
                    {assignedOptions.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>

                  <select multiple value={filterTags} onChange={e => setFilterTags(Array.from(e.target.selectedOptions).map(o => o.value))} className="px-3 py-2 border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-black/40 text-gray-800 dark:text-white text-sm">
                    {tagOptions.length === 0 ? <option disabled>Sin tags</option> : tagOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>

                  <input placeholder="IDs (1,2,3)" value={filterIds} onChange={e => setFilterIds(e.target.value)} className="px-3 py-2 border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-black/40 text-gray-800 dark:text-white text-sm" />
                </div>

                <div className="mt-3 flex gap-2 items-center">
                  <button
                    onClick={async () => {
                      // Preview: call /api/email/send with leadFilter and preview=true
                      try {
                        const key = String(t.id ?? t.name)
                        setPreviewResults(prev => ({ ...prev, [key]: [] }))
                        const token = localStorage.getItem('auth_token')
                        const leadFilter: any = {}
                        if (filterStatus) leadFilter.status = filterStatus
                        if (filterAssignedTo) leadFilter.assignedTo = filterAssignedTo
                        if (filterTags && Array.isArray(filterTags) && filterTags.length > 0) leadFilter.tags = filterTags
                        if (filterIds) leadFilter.ids = filterIds.split(',').map(s => Number(s.trim())).filter(Boolean)

                        const res = await fetch('/api/email/send', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                          body: JSON.stringify({ templateId: t.id, leadFilter, preview: true })
                        })
                        const data = await res.json()
                        if (!res.ok) return alert(data?.message || 'Error en preview')
                        // data.results expected
                        setPreviewResults(prev => ({ ...prev, [key]: data.results || (data.rendered ? [data.rendered] : []) }))
                      } catch (err) {
                        console.error(err)
                        alert('Error al generar vista previa')
                      }
                    }}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 text-sm"
                  >
                    Vista previa
                  </button>

                  <button
                    onClick={async () => {
                      if (!confirm('Enviar a leads que coincidan con este filtro?')) return
                      try {
                        setSending(true)
                        const token = localStorage.getItem('auth_token')
                        const leadFilter: any = {}
                        if (filterStatus) leadFilter.status = filterStatus
                        if (filterAssignedTo) leadFilter.assignedTo = filterAssignedTo
                        if (filterTags && Array.isArray(filterTags) && filterTags.length > 0) leadFilter.tags = filterTags
                        if (filterIds) leadFilter.ids = filterIds.split(',').map(s => Number(s.trim())).filter(Boolean)

                        const res = await fetch('/api/email/send', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                          body: JSON.stringify({ templateId: t.id, leadFilter })
                        })
                        const data = await res.json()
                        if (!res.ok) return alert(data?.message || 'Error al enviar')
                        alert('Envío iniciado. Resultados: ' + (Array.isArray(data.results) ? data.results.length : 'ok'))
                      } catch (err) {
                        console.error(err)
                        alert('Error al enviar')
                      } finally { setSending(false) }
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 text-sm"
                  >
                    Enviar a filtro
                  </button>

                  <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} className="border border-gray-200 dark:border-white/10 rounded-md px-3 py-2 bg-white dark:bg-black/40 text-gray-800 dark:text-white text-sm" />
                  <button
                    onClick={async () => {
                      if (!scheduleAt) return alert('Selecciona fecha/hora para programar')
                      try {
                        setScheduling(true)
                        const token = localStorage.getItem('auth_token')
                        const leadFilter: any = {}
                        if (filterStatus) leadFilter.status = filterStatus
                        if (filterAssignedTo) leadFilter.assignedTo = filterAssignedTo
                        if (filterTags && Array.isArray(filterTags) && filterTags.length > 0) leadFilter.tags = filterTags
                        if (filterIds) leadFilter.ids = filterIds.split(',').map(s => Number(s.trim())).filter(Boolean)

                        const res = await fetch('/api/email/schedule', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                          body: JSON.stringify({ templateId: t.id, leadFilter, sendAt: scheduleAt })
                        })
                        const data = await res.json()
                        if (!res.ok) return alert(data?.message || 'Error al programar')
                        alert('Programado (' + (Array.isArray(data.created) ? data.created.length + ' jobs' : '1') + ')')
                      } catch (err) {
                        console.error(err)
                        alert('Error al programar')
                      } finally { setScheduling(false) }
                    }}
                    className="px-3 py-1 bg-yellow-600 text-white rounded-md shadow-sm hover:bg-yellow-700 text-sm"
                  >
                    Programar a filtro
                  </button>
                </div>

                {(() => {
                  const key = String(t.id ?? t.name)
                  const list = previewResults[key]
                  if (!list || list.length === 0) return null
                  const total = list.length
                  const slice = list.slice(0, PREVIEW_LIMIT)
                  return (
                    <div className="mt-4 border-t border-gray-200 dark:border-white/10 pt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-800 dark:text-white">Vista previa (mostrando {slice.length} de {total})</div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setPreviewResults(prev => { const copy = { ...prev }; delete copy[key]; return copy })} className="text-xs px-2 py-1 border border-gray-200 dark:border-white/10 rounded text-gray-700 dark:text-white">Cerrar vista previa</button>
                        </div>
                      </div>

                      <div className="grid gap-3 max-h-[44vh] overflow-auto">
                        {slice.map((r, i) => (
                          <div key={i} className="rounded-md p-3 bg-white border border-gray-100 dark:bg-black/30 dark:border-white/5">
                            <div className="text-xs text-gray-600 dark:text-white/60">Para: {r.to}</div>
                            <div className="font-semibold text-gray-900 dark:text-white mt-1">{r.subject}</div>
                            <div className="prose max-w-none mt-2 text-gray-800 dark:prose-invert dark:text-white" dangerouslySetInnerHTML={{ __html: r.body || '' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          ))}
          {templatesToShow.length === 0 && (
            <div className="text-gray-600 dark:text-white/60">No hay plantillas todavía</div>
          )}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 dark:bg-black/60 p-4 overflow-auto">
          <div className="bg-white dark:bg-black/80 p-6 rounded w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-white/10 text-gray-900 dark:text-white">
            <h4 className="text-lg font-semibold mb-3">{editing?.id ? 'Editar plantilla' : 'Nueva plantilla'}</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm">Nombre</label>
                <input value={editing?.name || ''} onChange={e => setEditing((prev: EmailTemplate | null) => ({ ...(prev ?? {}), name: e.target.value }))} className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-sm">Asunto</label>
                <input value={editing?.subject || ''} onChange={e => setEditing((prev: EmailTemplate | null) => ({ ...(prev ?? {}), subject: e.target.value }))} className="w-full border rounded px-2 py-1" />
              </div>

              <div>
                <label className="block text-sm mb-2">Cuerpo (HTML) — Editor simple</label>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => {
                    // bold
                    const editor = document.getElementById('etm-editor')
                    if (editor) document.execCommand('bold')
                  }} className="px-2 py-1 border rounded">B</button>
                  <button type="button" onClick={() => { const editor = document.getElementById('etm-editor'); if (editor) document.execCommand('italic') }} className="px-2 py-1 border rounded">I</button>
                  <button type="button" onClick={() => {
                    const placeholder = prompt('Placeholder name (ej: name)')
                    if (!placeholder) return
                    const editor = document.getElementById('etm-editor')
                    if (editor) document.execCommand('insertHTML', false, `{{${placeholder}}}`)
                  }} className="px-2 py-1 border rounded">Insertar placeholder</button>
                  <button type="button" onClick={() => {
                    const placeholder = prompt('Placeholder name (ej: name)')
                    if (!placeholder) return
                    const editor = document.getElementById('etm-editor')
                    if (editor) document.execCommand('insertHTML', false, `{{${placeholder}}}`)
                  }} className="px-2 py-1 border rounded">Insertar placeholder</button>
                  <button type="button" onClick={() => setShowMedia(true)} className="px-2 py-1 border rounded">Media</button>
                </div>
                <div>
                  <Suspense fallback={<div className="p-6">Cargando editor...</div>}>
                    <QuillEditor ref={editorRef} value={editing?.body || ''} onChange={(val: string) => setEditing((prev) => ({ ...(prev ?? {}), body: val }))} />
                  </Suspense>
                </div>
                <div className="text-xs text-gray-700 dark:text-white/70 mt-2">Usa placeholders como <code>{'{{name}}'}</code> o <code>{'{{company}}'}</code></div>

                <div className="mt-3 p-3 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded text-sm">
                  <div className="font-medium mb-2 text-gray-800 dark:text-white">Variables de lead disponibles</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {leadVariables.map((v) => (
                      <div key={v} className="px-2 py-1 bg-white dark:bg-black/60 border border-gray-100 dark:border-white/5 rounded text-gray-800 dark:text-white">{v}</div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-700 dark:text-white/70 mt-2">Ejemplos: <code>{'{{lead.name}}'}</code> o <code>{'{{name}}'}</code> (ambas pueden resolverse)</div>
                </div>

                {/* Modal preview removed: inline preview under templates is sufficient */}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => { setShowNew(false); setEditing(null) }} className="px-3 py-1 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white rounded">Cancelar</button>
                <button onClick={handleSave} className="px-3 py-1 bg-indigo-600 text-white rounded">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showMedia && (
        <MediaLibrary onClose={() => setShowMedia(false)} onSelect={(url) => {
          // Insert image into Quill at cursor position when possible.
          // We need a stable ref to the QuillEditor instance — try to find it from the DOM/React tree.
          // Simpler approach: update editing.body by inserting the image HTML if ref isn't available.
          // Try to get the QuillEditor component via a known ref stored on the element.
          if (editorRef.current?.insertImage) {
            editorRef.current.insertImage(url)
            const html = editorRef.current.getHTML()
            setEditing((prev) => ({ ...(prev ?? {}), body: html }))
          } else {
            // Fallback: append image HTML to the template body
            setEditing((prev) => ({ ...(prev ?? {}), body: `${prev?.body ?? ''}<img src="${url}" alt=""/>` }))
          }
          setShowMedia(false)
        }} />
      )}
    </div>
    </section>
  )
}
