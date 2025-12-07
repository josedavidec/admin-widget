import { useEffect, useState, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { type Brand, type SocialMediaMetric } from '../../types/admin'

type SocialMetricsPanelProps = {
  brands: Brand[]
  selectedBrandId?: number | null
}

export function SocialMetricsPanel({ brands, selectedBrandId }: SocialMetricsPanelProps) {
  const [metrics, setMetrics] = useState<SocialMediaMetric[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<number | null>(selectedBrandId || null)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [days, setDays] = useState(30)
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)

  const platforms = useMemo(() => ['instagram', 'tiktok', 'youtube', 'linkedin', 'twitter', 'facebook'], [])
  const platformEmojis: Record<string, string> = {
    instagram: '📸',
    tiktok: '🎵',
    youtube: '📺',
    linkedin: '💼',
    twitter: '𝕏',
    facebook: '📘',
  }

  const platformColors: Record<string, string> = {
    instagram: '#E1306C',
    tiktok: '#000000',
    youtube: '#FF0000',
    linkedin: '#0A66C2',
    twitter: '#1DA1F2',
    facebook: '#1877F2',
  }

  useEffect(() => {
    if (!selectedBrand) return

    const fetchMetrics = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          brandId: String(selectedBrand),
          period,
          days: String(days),
        })
        
        const response = await fetch(`/api/social-metrics?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        }
      } catch (err) {
        console.error('Error fetching metrics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [selectedBrand, period, days])

  // Simular datos para demostración si no hay métricas
  useEffect(() => {
    if (!selectedBrand || metrics.length > 0) return

    // Datos de ejemplo para demostración
    const demoMetrics: SocialMediaMetric[] = []
    const today = new Date()
    
    for (const platform of platforms) {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        
        demoMetrics.push({
          id: demoMetrics.length + 1,
          brandId: selectedBrand,
          platform: platform as SocialMediaMetric['platform'],
          followers: Math.floor(Math.random() * 50000) + 10000,
          engagement: Math.random() * 8 + 0.5,
          reach: Math.floor(Math.random() * 200000) + 50000,
          impressions: Math.floor(Math.random() * 500000) + 100000,
          date: date.toISOString().split('T')[0],
          period: 'daily',
        })
      }
    }

    setMetrics(demoMetrics)
  }, [selectedBrand, metrics.length, platforms])

  if (!selectedBrand) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
        <p className="text-gray-600 dark:text-gray-400">Selecciona una marca para ver sus métricas de redes sociales</p>
      </div>
    )
  }

  const brand = brands.find(b => b.id === selectedBrand)
  const platformMetrics = metrics.reduce((acc, m) => {
    if (!acc[m.platform]) {
      acc[m.platform] = []
    }
    acc[m.platform].push(m)
    return acc
  }, {} as Record<string, SocialMediaMetric[]>)

  const platformSummary = Object.entries(platformMetrics).map(([platform, metricsList]: [string, SocialMediaMetric[]]) => ({
    platform,
    avgFollowers: Math.round(metricsList.reduce((sum, m) => sum + m.followers, 0) / metricsList.length),
    avgEngagement: (metricsList.reduce((sum, m) => sum + m.engagement, 0) / metricsList.length).toFixed(2),
    totalImpressions: metricsList.reduce((sum, m) => sum + m.impressions, 0),
  }))

  const timeSeriesData = Object.keys(platformMetrics)
    .reduce((acc, platform) => {
      const metrics = platformMetrics[platform as keyof typeof platformMetrics]
      if (!metrics) return acc
      metrics.forEach(metric => {
        const existing = acc.find(item => item.date === metric.date)
        if (existing) {
          existing[`${platform}_followers`] = metric.followers
          existing[`${platform}_engagement`] = metric.engagement
        } else {
          acc.push({
            date: metric.date,
            [`${platform}_followers`]: metric.followers,
            [`${platform}_engagement`]: metric.engagement,
          })
        }
      })
      return acc
    }, [] as Array<Record<string, unknown>>)
    .sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime())
    .slice(-30)

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📊 Métricas de Redes Sociales - {brand?.name}
        </h2>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Marca</label>
            <select
              value={selectedBrand || ''}
              onChange={(e) => {
                setSelectedBrand(Number(e.target.value))
                setSelectedPlatform(null)
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="">Seleccionar marca...</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Período</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Días</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
              <option value={365}>Último año</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plataforma</label>
            <select
              value={selectedPlatform || ''}
              onChange={(e) => setSelectedPlatform(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="">Todas</option>
              {platforms.map(p => (
                <option key={p} value={p}>{platformEmojis[p]} {p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Cargando métricas...</div>
        )}

        {!loading && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {platformSummary.map((summary) => (
                <div key={summary.platform} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{platformEmojis[summary.platform]}</span>
                    <div className="font-semibold text-gray-900 dark:text-white capitalize">{summary.platform}</div>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div>👥 Seguidores: <span className="font-semibold text-gray-900 dark:text-white">{summary.avgFollowers.toLocaleString()}</span></div>
                    <div>💬 Engagement: <span className="font-semibold text-gray-900 dark:text-white">{summary.avgEngagement}%</span></div>
                    <div>👁️ Impresiones: <span className="font-semibold text-gray-900 dark:text-white">{(summary.totalImpressions / 1000).toFixed(0)}K</span></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="space-y-8">
              {/* Followers Trend */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Evolución de Seguidores</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#f3f4f6' }}
                    />
                    <Legend />
                    {platforms
                      .filter(p => !selectedPlatform || p === selectedPlatform)
                      .map(platform => (
                        <Line
                          key={`${platform}_followers`}
                          type="monotone"
                          dataKey={`${platform}_followers`}
                          stroke={platformColors[platform]}
                          name={`${platformEmojis[platform]} ${platform}`}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Engagement Trend */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Tasa de Engagement (%)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#f3f4f6' }}
                    />
                    <Legend />
                    {platforms
                      .filter(p => !selectedPlatform || p === selectedPlatform)
                      .map(platform => (
                        <Line
                          key={`${platform}_engagement`}
                          type="monotone"
                          dataKey={`${platform}_engagement`}
                          stroke={platformColors[platform]}
                          name={`${platformEmojis[platform]} ${platform}`}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Platform Comparison */}
              {!selectedPlatform && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Comparación por Plataforma</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={platformSummary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="platform" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#f3f4f6' }}
                      />
                      <Legend />
                      <Bar dataKey="avgFollowers" fill="#3b82f6" name="Seguidores Promedio" />
                      <Bar dataKey="avgEngagement" fill="#10b981" name="Engagement %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          💡 <strong>Nota:</strong> Las métricas se actualizan automáticamente. Actualmente se muestran datos de demostración. Integra APIs reales de redes sociales (Meta, TikTok, Google) para obtener datos en tiempo real.
        </p>
      </div>
    </div>
  )
}
