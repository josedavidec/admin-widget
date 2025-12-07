type MetricCardProps = {
  label: string
  value: string
  sublabel?: string
}

export function MetricCard({ label, value, sublabel }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-xl p-5 transition-colors duration-200">
      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{value}</p>
      {sublabel && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{sublabel}</p>}
    </div>
  )
}
