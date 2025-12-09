import { useEffect, useState } from 'react'

type MediaItem = {
  id: number
  file_name: string
  original_name?: string
  mime_type?: string
  size?: number
  url?: string
  created_at?: string
}

type Props = {
  onClose?: () => void
  onSelect?: (url: string) => void
  inline?: boolean
  onNotify?: (msg: string) => void
}

export default function MediaLibrary({ onClose, onSelect, inline = false, onNotify }: Props) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const notify = (msg: string) => {
    if (typeof onNotify === 'function') {
      try { onNotify(msg); return } catch (e) { /* ignore */ }
    }
    try { alert(msg) } catch (e) { console.log(msg) }
  }

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/media')
      if (!res.ok) throw new Error('Error fetching media')
      const data = await res.json()
      // Ensure any standalone uploads placed in /uploads (like LOGO1.webp) are visible
      const ensured: MediaItem[] = Array.isArray(data) ? data : []
      try {
        const specialLogo = '/uploads/LOGO1.webp'
        const head = await fetch(specialLogo, { method: 'HEAD' })
        if (head.ok && !ensured.find((it) => it.url === specialLogo)) {
          ensured.unshift({ id: 0, file_name: 'LOGO1.webp', original_name: 'LOGO1.webp', mime_type: 'image/webp', size: 0, url: specialLogo })
        }
      } catch (err) {
        // ignore
      }
      setItems(ensured)
    } catch (err) {
      console.error(err)
      notify('No se pudieron cargar los medios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchItems()
  }, [])

  const handleUpload = async () => {
    if (!file) return notify('Selecciona un archivo')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      setItems(prev => [data, ...prev])
      setFile(null)
      notify('Subido')
    } catch (err) {
      console.error(err)
      notify('Error al subir archivo')
    } finally {
      setUploading(false)
    }
  }

  const handleImport = async () => {
    if (!confirm('Importar archivos desde la carpeta uploads al registro de la base de datos?')) return
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/media/import', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : undefined })
        if (!res.ok) {
          if (res.status === 401) return notify('No autorizado. Inicia sesión como admin.')
          throw new Error('Import failed')
        }
        const data = await res.json()
        // refresh list
        await fetchItems()
        notify(`Importados: ${data.count || 0}`)
    } catch (err) {
      console.error(err)
        notify('Error al importar archivos')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminar archivo?')) return
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      if (!res.ok) throw new Error('Delete failed')
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error(err)
      notify('Error al eliminar')
    }
  }

  if (inline) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Media Library</h3>
          <div className="flex items-center gap-2">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button disabled={uploading} onClick={handleUpload} className="px-3 py-1 bg-blue-600 text-white rounded">Subir</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div>Cargando...</div>
          ) : (
            items.map(item => (
              <div key={item.id} className="border rounded p-2 bg-gray-50 dark:bg-gray-700">
                <div className="h-36 mb-2 flex items-center justify-center bg-white overflow-hidden">
                  {item.mime_type?.startsWith('image') ? (
                    <img src={item.url} alt={item.original_name} className="max-h-full object-contain" />
                  ) : (
                    <div className="text-sm text-gray-600">{item.original_name}</div>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-xs truncate mr-2">{item.original_name}</div>
                  <div className="flex gap-2">
                    <button onClick={() => { onSelect?.(item.url ?? ''); }} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Seleccionar</button>
                    <button onClick={() => handleDelete(item.id)} className="px-2 py-1 border rounded text-xs">Eliminar</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Media Library</h3>
          <div className="flex items-center gap-2">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button disabled={uploading} onClick={handleUpload} className="px-3 py-1 bg-blue-600 text-white rounded">Subir</button>
            <button disabled={loading} onClick={handleImport} className="px-3 py-1 border rounded">Importar uploads</button>
            <button onClick={() => { onClose?.(); }} className="px-3 py-1 border rounded">Cerrar</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div>Cargando...</div>
          ) : (
            items.map(item => (
              <div key={item.id} className="border rounded p-2 bg-gray-50 dark:bg-gray-700">
                <div className="h-36 mb-2 flex items-center justify-center bg-white overflow-hidden">
                  {item.mime_type?.startsWith('image') ? (
                    <img src={item.url} alt={item.original_name} className="max-h-full object-contain" />
                  ) : (
                    <div className="text-sm text-gray-600">{item.original_name}</div>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-xs truncate mr-2">{item.original_name}</div>
                  <div className="flex gap-2">
                    <button onClick={() => { onSelect?.(item.url ?? ''); onClose?.(); }} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Seleccionar</button>
                    <button onClick={() => handleDelete(item.id)} className="px-2 py-1 border rounded text-xs">Eliminar</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
