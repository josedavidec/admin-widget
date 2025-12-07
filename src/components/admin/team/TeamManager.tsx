import { type TeamMember } from '../../../types/admin'
import { type ChangeEvent, type FormEvent } from 'react'

type TeamManagerProps = {
  teamMembers: TeamMember[]
  membersLoading: boolean
  currentUser: TeamMember | null
  teamMemberForm: {
    name: string
    email: string
    role: string
    isAdmin: boolean
    password?: string
    photo: File | null
  }
  editingMemberId: number | null
  teamMemberSaving: boolean
  onFieldChange: (field: 'name' | 'email' | 'role' | 'password') => (e: ChangeEvent<HTMLInputElement>) => void
  onCheckboxChange: (field: 'isAdmin') => (e: ChangeEvent<HTMLInputElement>) => void
  onPhotoChange: (e: ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>
  onEdit: (member: TeamMember) => void
  onDelete: (id: number) => void
  onCancelEdit: () => void
}

export function TeamManager({
  teamMembers,
  membersLoading,
  currentUser,
  teamMemberForm,
  editingMemberId,
  teamMemberSaving,
  onFieldChange,
  onCheckboxChange,
  onPhotoChange,
  onSubmit,
  onEdit,
  onDelete,
  onCancelEdit
}: TeamManagerProps) {
  const isSuperAdmin = currentUser?.isSuperAdmin

  // Super Admin: gestiona administradores
  // Admin: gestiona su equipo
  const pageTitle = isSuperAdmin ? 'Gestión de Administradores' : 'Equipo'
  const pageDesc = isSuperAdmin 
    ? 'Crea el primer administrador para que la empresa pueda usar la plataforma.' 
    : 'Visualiza tu equipo. Solo admins pueden crear miembros.'

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-xl p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{pageTitle}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {pageDesc}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[2fr_2fr_2fr] md:items-start">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400" htmlFor="member-name">
              Nombre
            </label>
            <input
              id="member-name"
              type="text"
              value={teamMemberForm.name}
              onChange={onFieldChange('name')}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
              placeholder="Ej. Juan Pérez"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400" htmlFor="member-email">
              Email (opcional)
            </label>
            <input
              id="member-email"
              type="email"
              value={teamMemberForm.email}
              onChange={onFieldChange('email')}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
              placeholder="juan@empresa.com"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400" htmlFor="member-role">
              Rol (opcional)
            </label>
            <input
              id="member-role"
              type="text"
              value={teamMemberForm.role}
              onChange={onFieldChange('role')}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
              placeholder="Ej. Ejecutivo comercial"
              autoComplete="organization-role"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400" htmlFor="member-password">
              Contraseña {editingMemberId ? '(opcional)' : ''}
            </label>
            <input
              id="member-password"
              type="password"
              value={teamMemberForm.password || ''}
              onChange={onFieldChange('password')}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
              placeholder={editingMemberId ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'}
              autoComplete={editingMemberId ? 'current-password' : 'new-password'}
              minLength={editingMemberId ? undefined : 6}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400" htmlFor="member-photo">
            Foto (opcional)
          </label>
          <input
            id="member-photo"
            type="file"
            accept="image/*"
            onChange={onPhotoChange}
            className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
          />
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={teamMemberForm.isAdmin}
              onChange={onCheckboxChange('isAdmin')}
              className="rounded border-gray-300"
            />
            {isSuperAdmin ? 'Es Administrador' : 'Admin'}
          </label>
        </div>

        <div className="flex items-center gap-2">
          {editingMemberId && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={teamMemberSaving}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {teamMemberSaving ? 'Guardando…' : editingMemberId ? 'Actualizar' : 'Agregar'}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-gray-600 dark:text-gray-400">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold border border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {teamMembers.map((member) => (
              <tr key={member.id}>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  <div className="flex items-center gap-3">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt={member.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {member.name}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {member.email ? (
                    <a href={`mailto:${member.email}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                      {member.email}
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {member.role ? (
                    <span>{member.role}</span>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {member.isAdmin ? (
                    <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      Admin
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(member)}
                      className="inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(member.id)}
                      className="inline-flex items-center rounded-lg border border-red-200 dark:border-red-900/30 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {teamMembers.length === 0 && !membersLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">
                  {isSuperAdmin ? 'Sin administradores aún' : 'Tu equipo está vacío'}
                </td>
              </tr>
            )}
            {membersLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">
                  Cargando...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
