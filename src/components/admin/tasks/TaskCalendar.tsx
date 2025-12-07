import { useState, useEffect } from 'react'
import { type Task } from '../../../types/admin'

type TaskCalendarProps = {
  tasks: Task[]
  startDate?: Date
}

export function TaskCalendar({ tasks, startDate }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(startDate || new Date())

  useEffect(() => {
    if (startDate) {
      setCurrentDate(startDate)
    }
  }, [startDate])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const days = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    return { days, firstDay }
  }

  const { days, firstDay } = getDaysInMonth(currentDate)
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const getTasksForDay = (day: number) => {
    return tasks.filter(task => {
      if (!task.dueDate && !task.startDate) return false
      
      // Create local date for comparison (midnight)
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const targetTime = targetDate.getTime()
      
      // Parse UTC dates to local dates (preserving the calendar date)
      const parseToLocal = (dateStr: string) => {
        const d = new Date(dateStr)
        return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).getTime()
      }

      const start = task.startDate ? parseToLocal(task.startDate) : null
      const due = task.dueDate ? parseToLocal(task.dueDate) : null

      if (start && due) {
        return targetTime >= start && targetTime <= due
      } else if (start) {
        return targetTime === start
      } else if (due) {
        return targetTime === due
      }
      return false
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
          <div key={day} className="py-2">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 dark:bg-gray-700 gap-px">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white dark:bg-gray-800 min-h-[100px]" />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1
          const dayTasks = getTasksForDay(day)
          const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString()

          return (
            <div key={day} className={`bg-white dark:bg-gray-800 min-h-[100px] p-1 ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
              <div className={`text-right text-xs mb-1 ${isToday ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {day}
              </div>
              <div className="space-y-1">
                {dayTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="text-[10px] p-1 rounded truncate border-l-2 dark:text-gray-300"
                    style={{ 
                      backgroundColor: (task.brandColor || '#e5e7eb') + '20',
                      borderLeftColor: task.brandColor || '#9ca3af'
                    }}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
