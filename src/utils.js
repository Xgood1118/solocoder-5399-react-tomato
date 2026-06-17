import { SESSION_TYPES, STORAGE_KEYS, DEFAULT_SETTINGS } from './constants'
import { format, startOfDay, startOfWeek, differenceInCalendarDays, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export const loadFromStorage = (key, defaultValue) => {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return defaultValue
    return JSON.parse(raw)
  } catch {
    return defaultValue
  }
}

export const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Storage save failed:', e)
  }
}

export const loadSettings = () => {
  const saved = loadFromStorage(STORAGE_KEYS.SETTINGS, {})
  return { ...DEFAULT_SETTINGS, ...saved }
}

export const loadSessions = () => {
  return loadFromStorage(STORAGE_KEYS.SESSIONS, [])
}

export const loadCurrentState = () => {
  return loadFromStorage(STORAGE_KEYS.CURRENT_STATE, null)
}

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export const formatDate = (isoString) => {
  if (!isoString) return ''
  try {
    return format(parseISO(isoString), 'yyyy-MM-dd HH:mm', { locale: zhCN })
  } catch {
    return isoString
  }
}

export const formatDateOnly = (isoString) => {
  if (!isoString) return ''
  try {
    return format(parseISO(isoString), 'yyyy-MM-dd', { locale: zhCN })
  } catch {
    return isoString
  }
}

export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}小时${mins}分`
  }
  return `${mins}分钟`
}

export const getTypeLabel = (type) => {
  switch (type) {
    case SESSION_TYPES.WORK: return '工作'
    case SESSION_TYPES.SHORT_BREAK: return '短休息'
    case SESSION_TYPES.LONG_BREAK: return '长休息'
    default: return type
  }
}

export const exportToCSV = (sessions) => {
  const headers = ['id', 'type', 'project', 'started_at', 'ended_at', 'duration_secs', 'completed']
  const rows = sessions.map(s => {
    const startedAt = new Date(s.started_at)
    const endedAt = s.ended_at ? new Date(s.ended_at) : startedAt
    const duration = Math.max(0, Math.floor((endedAt - startedAt) / 1000))
    return [
      s.id,
      s.type,
      s.project || '',
      format(startedAt, "yyyy-MM-dd'T'HH:mm:ss"),
      s.ended_at ? format(endedAt, "yyyy-MM-dd'T'HH:mm:ss") : '',
      duration,
      s.completed ? '1' : '0',
    ]
  })
  const csv = [headers, ...rows].map(row => row.map(field => {
    const s = String(field ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }).join(',')).join('\n')

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const filename = `tomato-history-${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const playDingSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
  } catch (e) {
    console.warn('Audio play failed:', e)
  }
}

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export const showBrowserNotification = (title, body) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  try {
    new Notification(title, { body, icon: '/tomato.svg' })
    return true
  } catch {
    return false
  }
}

export const computeStats = (sessions, settings) => {
  const completedWork = sessions.filter(s => s.type === SESSION_TYPES.WORK && s.completed)
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: settings.weekStartsOnMonday ? 1 : 0 })
  const todayStart = startOfDay(now)

  const todayCount = completedWork.filter(s => new Date(s.started_at) >= todayStart).length
  const weekCount = completedWork.filter(s => new Date(s.started_at) >= weekStart).length

  const daySet = new Set()
  completedWork.forEach(s => {
    daySet.add(formatDateOnly(s.started_at))
  })

  const sortedDays = [...daySet].sort().reverse()
  let streak = 0
  const todayStr = formatDateOnly(now.toISOString())
  const yesterdayStr = formatDateOnly(new Date(now.getTime() - 86400000).toISOString())
  if (sortedDays.length > 0 && (sortedDays[0] === todayStr || sortedDays[0] === yesterdayStr)) {
    let expectedDate = new Date(sortedDays[0])
    for (const dayStr of sortedDays) {
      const day = formatDateOnly(expectedDate.toISOString())
      if (dayStr === day) {
        streak++
        expectedDate = new Date(expectedDate.getTime() - 86400000)
      } else {
        break
      }
    }
  }

  const projectMap = new Map()
  completedWork.forEach(s => {
    const key = s.project || '(未分类)'
    if (!projectMap.has(key)) projectMap.set(key, { count: 0, seconds: 0 })
    const entry = projectMap.get(key)
    entry.count++
    if (s.started_at && s.ended_at) {
      entry.seconds += Math.floor((new Date(s.ended_at) - new Date(s.started_at)) / 1000)
    }
  })
  const projectStats = [...projectMap.entries()].map(([name, v]) => ({
    name,
    count: v.count,
    seconds: v.seconds,
    value: v.count,
  })).sort((a, b) => b.count - a.count)

  const last7days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000)
    const ds = formatDateOnly(d.toISOString())
    const count = completedWork.filter(s => formatDateOnly(s.started_at) === ds).length
    last7days.push({
      date: format(d, 'MM/dd', { locale: zhCN }),
      番茄数: count,
    })
  }

  const activeDays = daySet.size || 1
  const avgPerDay = Math.round((completedWork.length / activeDays) * 10) / 10

  return {
    todayCount,
    weekCount,
    streak,
    projectStats,
    last7days,
    avgPerDay,
    totalCount: completedWork.length,
  }
}

export const minutesToSeconds = (m) => m * 60
