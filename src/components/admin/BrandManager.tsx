import { useState } from 'react'
import { type Brand, type SocialMediaAccount } from '../../types/admin'

type BrandManagerProps = {
  brands: Brand[]
  loading: boolean
  onCreate: (name: string, color: string, pkg: string, contactInfo: string, socialAccounts?: SocialMediaAccount[]) => void
  onDelete: (id: number) => void
}

export function BrandManager({ brands, loading, onCreate, onDelete }: BrandManagerProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [pkg, setPkg] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [socialAccounts, setSocialAccounts] = useState<SocialMediaAccount[]>([])
  const [expandedBrandId, setExpandedBrandId] = useState<number | null>(null)

  const platforms: Array<{ id: 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'twitter' | 'facebook'; name: string; icon: string }> = [
    { id: 'instagram', name: 'Instagram', icon: '📸' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵' },
    { id: 'youtube', name: 'YouTube', icon: '📺' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
    { id: 'twitter', name: 'Twitter', icon: '𝕏' },
    { id: 'facebook', name: 'Facebook', icon: '📘' },
  ]

  const handleAddSocial = (platform: 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'twitter' | 'facebook') => {
    setSocialAccounts([...socialAccounts, { platform, username: '' }])
  }

  const handleRemoveSocial = (index: number) => {
    setSocialAccounts(socialAccounts.filter((_, i) => i !== index))
  }

  const handleUpdateSocial = (index: number, field: 'username' | 'url', value: string) => {
    const updated = [...socialAccounts]
    updated[index] = { ...updated[index], [field]: value }
    setSocialAccounts(updated)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onCreate(name.trim(), color, pkg.trim(), contactInfo.trim(), socialAccounts.length > 0 ? socialAccounts : undefined)
      setName('')
      setColor('#3b82f6')
      setPkg('')
      setContactInfo('')
      setSocialAccounts([])
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Gestionar Marcas</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la marca</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej. Cliente A"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paquete Contratado</label>
              <input
                type="text"
                value={pkg}
                onChange={(e) => setPkg(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej. Plan Premium"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Info de Contacto</label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej. Juan Pérez - juan@empresa.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-full p-1 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer dark:bg-gray-700"
              />
            </div>
          </div>

          {/* Redes Sociales */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Redes Sociales (Opcional)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-4">
              {platforms.map((platform) => {
                const hasAccount = socialAccounts.some(acc => acc.platform === platform.id)
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => !hasAccount && handleAddSocial(platform.id)}
                    disabled={hasAccount}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      hasAccount
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 opacity-50 cursor-not-allowed'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500'
                    }`}
                  >
                    <div className="text-xl mb-1">{platform.icon}</div>
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{platform.name}</div>
                  </button>
                )
              })}
            </div>

            {socialAccounts.map((account, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={account.username}
                  onChange={(e) => handleUpdateSocial(idx, 'username', e.target.value)}
                  placeholder={`Usuario de ${platforms.find(p => p.id === account.platform)?.name}`}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSocial(idx)}
                  className="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Agregar Marca'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((brand) => (
          <div key={brand.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                    style={{ backgroundColor: brand.color }}
                  >
                    {brand.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{brand.name}</h3>
                    {brand.package && (
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                        {brand.package}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(brand.id)}
                  className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
              
              {brand.contactInfo && (
                <div className="text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2 mt-1">
                  <p className="font-medium text-xs text-gray-500 dark:text-gray-500 uppercase mb-1">Contacto</p>
                  {brand.contactInfo}
                </div>
              )}

              {/* Redes Sociales */}
              {brand.socialAccounts && brand.socialAccounts.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-1">
                  <button
                    onClick={() => setExpandedBrandId(expandedBrandId === brand.id ? null : brand.id)}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {expandedBrandId === brand.id ? '▼' : '▶'} Redes Sociales ({brand.socialAccounts.length})
                  </button>
                  {expandedBrandId === brand.id && (
                    <div className="mt-2 space-y-1">
                      {brand.socialAccounts.map((social, idx) => (
                        <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <span>{platforms.find(p => p.id === social.platform)?.icon}</span>
                          <a href={social.url || `#`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            @{social.username}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {brands.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
            No hay marcas registradas.
          </div>
        )}
      </div>
    </div>
  )
}
