import { useState } from 'react'
import { type BlogPost } from '../../types/admin'
// Replaced primitives Card/Button with plain HTML/Tailwind for simpler styling
import { Pencil, Trash2, Plus, X, Loader2, ExternalLink } from 'lucide-react'

interface BlogManagerProps {
  posts: BlogPost[]
  loading: boolean
  onCreate: (post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>
  onUpdate: (id: number, post: Partial<BlogPost>) => Promise<boolean>
  onDelete: (id: number) => Promise<void>
}

export function BlogManager({ posts, loading, onCreate, onUpdate, onDelete }: BlogManagerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost>>({})
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (currentPost.id) {
        await onUpdate(currentPost.id, currentPost)
      } else {
        await onCreate(currentPost as Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>)
      }
      setIsEditing(false)
      setCurrentPost({})
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (post: BlogPost) => {
    // Ensure date is YYYY-MM-DD for the input
    const dateStr = post.date ? post.date.split('T')[0] : ''
    setCurrentPost({ ...post, date: dateStr })
    setIsEditing(true)
  }

  const handleDelete = async (id: number) => {
    await onDelete(id)
  }

  const handleNew = () => {
    setCurrentPost({
      title: '',
      slug: '',
      date: new Date().toISOString().split('T')[0],
      image: '',
      excerpt: '',
      description: '',
      content: ''
    })
    setIsEditing(true)
  }

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm py-6">
        <div className="flex flex-row items-center justify-between px-6">
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {currentPost.id ? 'Editar Entrada' : 'Nueva Entrada'}
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                <input
                  type="text"
                  value={currentPost.title || ''}
                  onChange={e => setCurrentPost(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={currentPost.slug || ''}
                  onChange={e => setCurrentPost(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                <input
                  type="date"
                  value={currentPost.date || ''}
                  onChange={e => setCurrentPost(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagen URL</label>
                <input
                  type="url"
                  value={currentPost.image || ''}
                  onChange={e => setCurrentPost(prev => ({ ...prev, image: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Extracto (Corto)</label>
              <textarea
                value={currentPost.excerpt || ''}
                onChange={e => setCurrentPost(prev => ({ ...prev, excerpt: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción (SEO)</label>
              <textarea
                value={currentPost.description || ''}
                onChange={e => setCurrentPost(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contenido (HTML)</label>
              <textarea
                value={currentPost.content || ''}
                onChange={e => setCurrentPost(prev => ({ ...prev, content: e.target.value }))}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-primary text-white px-4 py-2 text-sm disabled:opacity-50"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentPost.id ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Entradas del Blog ({posts.length})</h2>
        <button
          onClick={handleNew}
          className="inline-flex items-center rounded-md bg-primary text-white px-4 py-2 text-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Entrada
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden rounded-xl shadow-sm">
              <div className="flex flex-col md:flex-row">
                {post.image && (
                  <div className="w-full md:w-48 h-32 md:h-auto relative">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">{post.title}</h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                        {post.date ? post.date.split('T')[0] : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{post.excerpt}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                        /{post.slug}
                      </span>
                    </div>
                  </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Ver
                      </a>
                      <button
                        onClick={() => handleEdit(post)}
                        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="inline-flex items-center gap-2 rounded-md bg-red-600 text-white px-3 py-2 text-sm hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </button>
                    </div>
                </div>
              </div>
            </div>
          ))}
          {posts.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
              No hay entradas en el blog. ¡Crea la primera!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
