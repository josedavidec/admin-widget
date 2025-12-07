import { useState, useEffect, useRef } from 'react'
import { type Lead, type Task, type TeamMember, type Brand } from '../../../types/admin'
import { ArrowUpRight, CheckCircle2, Clock, Users, TrendingUp, AlertCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts'

// Helper component to handle responsive charts manually and avoid Recharts console errors
function ResponsiveChartContainer({ children, height = 300 }: { children: (width: number, height: number) => React.ReactNode, height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!ref.current) return
    
    const updateWidth = () => {
      if (ref.current) {
        const currentWidth = ref.current.getBoundingClientRect().width
        if (currentWidth > 0) setWidth(currentWidth)
      }
    }

    // Initial measure
    updateWidth()

    // Observer for resizes
    const observer = new ResizeObserver(updateWidth)
    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ width: '100%', height }}>
      {width > 0 ? children(width, height) : null}
    </div>
  )
}

type DashboardOverviewProps = {
  leads: Lead[]
  tasks: Task[]
  teamMembers: TeamMember[]
  brands: Brand[]
  onNavigate: (tab: 'leads' | 'tasks' | 'team' | 'brands' | 'blog') => void
}

export function DashboardOverview({ leads, tasks, teamMembers, brands, onNavigate }: DashboardOverviewProps) {
  // Calculate Metrics
  const totalLeads = leads.length
  const newLeads = leads.filter(l => {
    const date = new Date(l.created_at)
    const now = new Date()
    return (now.getTime() - date.getTime()) / (1000 * 3600 * 24) <= 7
  }).length
  
  const pendingTasks = tasks.filter(t => t.status === 'pending').length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'completed') return false
    return new Date(t.dueDate) < new Date()
  }).length

  const activeTeamMembers = teamMembers.length

  // Chart Data Preparation
  const leadsByMonth = leads.reduce((acc, lead) => {
    const date = new Date(lead.created_at)
    const month = date.toLocaleString('default', { month: 'short' })
    const existing = acc.find(item => item.name === month)
    if (existing) {
      existing.value += 1
    } else {
      acc.push({ name: month, value: 1 })
    }
    return acc
  }, [] as { name: string; value: number }[]).slice(-6) // Last 6 months

  const taskStatusData = [
    { name: 'Pendientes', value: pendingTasks, color: '#8b5cf6' },
    { name: 'Completadas', value: completedTasks, color: '#10b981' },
    { name: 'Vencidas', value: overdueTasks, color: '#ef4444' }
  ].filter(item => item.value > 0)

  // Derived Recent Activity (Mocked from data sorting)
  const recentActivities = [
    ...leads.map(l => ({ type: 'lead', date: new Date(l.created_at), text: `Nuevo lead: ${l.name}`, id: l.id })),
    ...tasks.map(t => ({ type: 'task', date: new Date(t.createdAt), text: `Nueva tarea: ${t.title}`, id: t.id }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Resumen General</h2>
        <p className="text-gray-500 dark:text-gray-400">Bienvenido al panel de control. Aquí tienes lo más importante de hoy.</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group cursor-pointer" onClick={() => onNavigate('leads')}>
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={60} />
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Leads</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalLeads}</h3>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-500 flex items-center font-medium">
              <ArrowUpRight size={16} className="mr-1" />
              {newLeads}
            </span>
            <span className="text-gray-400 ml-2">esta semana</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group cursor-pointer" onClick={() => onNavigate('tasks')}>
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 size={60} />
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tareas Pendientes</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{pendingTasks}</h3>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {completedTasks} completadas
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group cursor-pointer" onClick={() => onNavigate('tasks')}>
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertCircle size={60} />
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tareas Vencidas</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{overdueTasks}</h3>
            </div>
          </div>
          <div className="mt-4 text-sm text-red-500 font-medium">
            Requieren atención
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group cursor-pointer" onClick={() => onNavigate('team')}>
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={60} />
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Equipo Activo</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{activeTeamMembers}</h3>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Gestionando leads y tareas
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Charts Section */}
        <div className="lg:col-span-2 grid gap-8">
          {/* Lead Growth Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Crecimiento de Leads</h3>
            <ResponsiveChartContainer height={300}>
              {(width, height) => (
                <AreaChart width={width} height={height} data={leadsByMonth}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 12 }} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#374151' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorLeads)" 
                  />
                </AreaChart>
              )}
            </ResponsiveChartContainer>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actividad Reciente</h3>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                    <div className={`mt-1 w-2 h-2 rounded-full ${activity.type === 'lead' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                    <div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{activity.text}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{activity.date.toLocaleDateString()} {activity.date.toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No hay actividad reciente.</p>
              )}
            </div>
          </div>
        </div>

        {/* Side Stats & Charts */}
        <div className="space-y-6">
          {/* Task Distribution Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estado de Tareas</h3>
            <ResponsiveChartContainer height={250}>
              {(width, height) => (
                <PieChart width={width} height={height}>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              )}
            </ResponsiveChartContainer>
          </div>

          <div className="bg-linear-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Estado del Sistema</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm opacity-90">
                <span>Marcas Activas</span>
                <span className="font-bold">{brands.length}</span>
              </div>
              <div className="w-full bg-blue-500/30 rounded-full h-1.5">
                <div className="bg-white h-1.5 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <p className="text-xs opacity-75 mt-2">Todo funcionando correctamente.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
