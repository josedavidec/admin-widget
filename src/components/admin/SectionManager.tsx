export type Sections = {
  leads: boolean
  team: boolean
  tasks: boolean
  brands: boolean
  blog: boolean
}

type SectionManagerProps = {
  isSuperAdmin: boolean
  sections?: Sections
  onSectionChange?: (section: keyof Sections, enabled: boolean) => void
}

export function SectionManager({ isSuperAdmin, sections = {
  leads: true,
  team: true,
  tasks: true,
  brands: true,
  blog: true,
}, onSectionChange }: SectionManagerProps) {
  const sectionConfig = [
    {
      key: 'leads' as const,
      name: 'Leads',
      description: 'Gestión de leads y prospectos',
      icon: '📊',
      color: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      key: 'team' as const,
      name: 'Equipo',
      description: 'Gestión del equipo de trabajo',
      icon: '👥',
      color: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      key: 'tasks' as const,
      name: 'Tareas',
      description: 'Sistema de tareas y proyectos',
      icon: '✓',
      color: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      key: 'brands' as const,
      name: 'Marcas',
      description: 'Gestión de marcas y clientes',
      icon: '🏷',
      color: 'bg-amber-100 dark:bg-amber-900/30'
    },
    {
      key: 'blog' as const,
      name: 'Blog',
      description: 'Gestión de contenido y publicaciones',
      icon: '📝',
      color: 'bg-pink-100 dark:bg-pink-900/30'
    },
  ]

  if (!isSuperAdmin) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-xl p-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gestión de Secciones</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Activa o desactiva las secciones que tu empresa puede utilizar. Los administradores solo verán las secciones que habilites aquí.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {sectionConfig.map((section) => (
          <button
            key={section.key}
            onClick={() => onSectionChange?.(section.key, !sections[section.key])}
            className={`relative group p-6 rounded-lg border-2 transition-all duration-200 ${
              sections[section.key]
                ? `border-blue-500 ${section.color}`
                : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 opacity-60 hover:opacity-80'
            }`}
          >
            {/* Check mark */}
            {sections[section.key] && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">✓</span>
              </div>
            )}

            {/* Content */}
            <div className="text-left">
              <div className="text-4xl mb-2">{section.icon}</div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{section.name}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{section.description}</p>
            </div>

            {/* Status */}
            <div className="mt-4 text-xs font-medium">
              {sections[section.key] ? (
                <span className="text-green-600 dark:text-green-400">Activo</span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">Inactivo</span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          💡 <strong>Nota:</strong> Los cambios aquí se aplican inmediatamente para todos los administradores. Las secciones desactivadas no aparecerán en el menú.
        </p>
      </div>
    </div>
  )
}
