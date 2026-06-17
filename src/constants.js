export const SESSION_TYPES = {
  WORK: 'work',
  SHORT_BREAK: 'short_break',
  LONG_BREAK: 'long_break',
}

export const TIMER_STATES = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  BREAK: 'break',
}

export const VIEW_TABS = {
  TIMER: 'timer',
  HISTORY: 'history',
  STATS: 'stats',
  SETTINGS: 'settings',
}

export const DEFAULT_SETTINGS = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  projects: [],
  enableCategories: false,
  soundEnabled: true,
  notificationEnabled: true,
  weekStartsOnMonday: true,
  theme: 'light',
  accentIndex: 0,
}

export const STORAGE_KEYS = {
  SESSIONS: 'tomato_sessions',
  SETTINGS: 'tomato_settings',
  CURRENT_STATE: 'tomato_current_state',
}

export const ACCENT_COLORS = [
  { primary: '#E07A5F', secondary: '#F2CC8F', name: '番茄红' },
  { primary: '#81B29A', secondary: '#F4F1DE', name: '薄荷绿' },
  { primary: '#3D405B', secondary: '#E07A5F', name: '深靛蓝' },
  { primary: '#A8DADC', secondary: '#457B9D', name: '冰川蓝' },
  { primary: '#B5838D', secondary: '#FFCDB2', name: '玫瑰粉' },
]
