import { useEffect, useState, useRef } from 'react'
import MediaLibrary from './MediaLibrary'
import QuillEditor, { type QuillEditorHandle } from './QuillEditor'

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

  useEffect(() => {
    if (fetchEmailTemplates) void fetchEmailTemplates()
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Plantillas de Email</h3>
        <div>
          <button onClick={() => { setShowNew(true); setEditing({ name: '', subject: '', body: '' }) }} className="px-3 py-1 bg-blue-600 text-white rounded">Nueva</button>
        </div>
      </div>

      <div>
        <label className="block text-sm">Correo de prueba</label>
        <div className="flex gap-2">
          <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" className="w-full px-3 py-2 border rounded mt-1" />
          <button onClick={() => { if (fetchEmailTemplates) void fetchEmailTemplates() }} className="px-3 py-2 border rounded mt-1">Recargar</button>
        </div>
      </div>

      {emailLoading ? (
        <div>Cargando plantillas...</div>
      ) : (
        <div className="space-y-3">
          {templatesToShow.map((t: EmailTemplate) => (
            <div key={t.id ?? t.name} className="border rounded p-3 bg-white dark:bg-gray-800">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.subject}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(t); setShowNew(true) }} className="px-2 py-1 border rounded">Editar</button>
                  {t.id ? (
                    <button onClick={() => { if (confirm('Eliminar plantilla?')) { if (deleteEmailTemplate && t.id) { void deleteEmailTemplate(t.id) } } }} className="px-2 py-1 border rounded">Eliminar</button>
                  ) : (
                    <>
                      <button onClick={async () => { setEditing(t); setShowNew(true) }} className="px-2 py-1 border rounded">Usar / Guardar</button>
                      <button onClick={async () => { if (createEmailTemplate) { await createEmailTemplate(t); if (fetchEmailTemplates) await fetchEmailTemplates() } }} className="px-2 py-1 bg-blue-600 text-white rounded">Guardar</button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <div className="prose max-w-none dark:prose-invert text-gray-900 dark:text-gray-100" dangerouslySetInnerHTML={{ __html: t.body || '' }} />
              </div>

              <div className="mt-3 flex gap-2">
                <button onClick={() => handleSendTest(t)} className="px-3 py-1 bg-green-600 text-white rounded">Enviar prueba</button>
                <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} className="border rounded px-2 py-1" />
                <button onClick={() => handleSchedule(t)} className="px-3 py-1 bg-yellow-600 text-white rounded">Programar</button>
              </div>
            </div>
          ))}
          {templatesToShow.length === 0 && (
            <div className="text-gray-500">No hay plantillas todavía</div>
          )}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-auto">
          <div className="bg-white dark:bg-gray-800 p-6 rounded w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
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
                  <QuillEditor ref={editorRef} value={editing?.body || ''} onChange={(val: string) => setEditing((prev) => ({ ...(prev ?? {}), body: val }))} />
                </div>
                <div className="text-xs text-gray-500 mt-2">Usa placeholders como <code>{'{{name}}'}</code> o <code>{'{{company}}'}</code></div>

                <div className="mt-4 border-t pt-4">
                  <h5 className="text-sm font-medium mb-2">Vista previa</h5>
                  <div className="border rounded p-3 bg-white dark:bg-gray-800 text-sm prose max-w-none dark:prose-invert text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700" dangerouslySetInnerHTML={{ __html: editing?.body || '<p></p>' }} />
                  <div className="text-xs text-gray-500 mt-2">Placeholders detectados: {extractPlaceholders(editing?.body).length === 0 ? '—' : extractPlaceholders(editing?.body).map(p => <span key={p} className="inline-block mr-2 px-2 py-0.5 bg-gray-100 rounded">{p}</span>)}</div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => { setShowNew(false); setEditing(null) }} className="px-3 py-1 border rounded">Cancelar</button>
                <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded">Guardar</button>
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
  )
}
