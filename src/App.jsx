import React, { useEffect, useReducer, useState, useCallback } from 'react'
import { reducer, createInitialState, ACTIONS } from './reducer'
import {
  loadSettings, loadSessions, loadCurrentState, saveToStorage,
} from './utils'
import { STORAGE_KEYS, VIEW_TABS, TIMER_STATES, SESSION_TYPES, ACCENT_COLORS } from './constants'
import Timer from './components/Timer'
import SessionList from './components/SessionList'
import StatsPanel from './components/StatsPanel'
import Settings from './components/Settings'
import NotificationManager from './components/NotificationManager'

const App = () => {
  const [settings, setSettings] = useState(() => loadSettings())
  const [sessions, setSessionsState] = useState(() => loadSessions())
  const [activeTab, setActiveTab] = useState(VIEW_TABS.TIMER)
  const [extraBreak, setExtraBreak] = useState(false)

  const savedCurrent = loadCurrentState()
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => createInitialState(settings, savedCurrent)
  )

  const setSessions = useCallback((list) => {
    setSessionsState(list)
    saveToStorage(STORAGE_KEYS.SESSIONS, list)
  }, [])

  const updateSettings = useCallback((newSettings) => {
    setSettings(newSettings)
    saveToStorage(STORAGE_KEYS.SETTINGS, newSettings)
    if (state.timerState === TIMER_STATES.IDLE) {
      dispatch({ type: ACTIONS.UPDATE_DURATION, payload: newSettings.workDuration })
    }
  }, [state.timerState])

  const handleStartWork = useCallback(() => {
    setExtraBreak(false)
    dispatch({ type: ACTIONS.START_WORK, payload: { settings, project: state.currentProject } })
  }, [settings, state.currentProject])

  const handleStartBreak = useCallback((isLong = false) => {
    setExtraBreak(!isLong && state._justFinishedType && state._justFinishedType !== SESSION_TYPES.WORK ? false : isLong)
    dispatch({ type: ACTIONS.START_BREAK, payload: { settings, isLong } })
  }, [settings, state._justFinishedType])

  const handlePause = useCallback(() => dispatch({ type: ACTIONS.PAUSE }), [])
  const handleResume = useCallback(() => dispatch({ type: ACTIONS.RESUME }), [])
  const handleCancel = useCallback(() => {
    setExtraBreak(false)
    dispatch({ type: ACTIONS.CANCEL, payload: { settings } })
  }, [settings])
  const handleSetProject = useCallback((p) => dispatch({ type: ACTIONS.SET_PROJECT, payload: p }), [])

  const handleCompleteAutoBreak = useCallback(() => {
    const total = state.workCompletedSinceLongBreak + 1
    const isLong = total > 0 && total % settings.longBreakInterval === 0
    setTimeout(() => {
      dispatch({
        type: ACTIONS.START_BREAK,
        payload: { settings, isLong }
      })
    }, 300)
  }, [settings, state.workCompletedSinceLongBreak])

  const handleUpdateSession = useCallback((id, updates) => {
    const list = sessions.map(s => s.id === id ? { ...s, ...updates } : s)
    setSessions(list)
  }, [sessions, setSessions])

  const handleDeleteSession = useCallback((id) => {
    setSessions(sessions.filter(s => s.id !== id))
  }, [sessions, setSessions])

  useEffect(() => {
    if (state._cancelledSessions && state._cancelledSessions.length > 0) {
      const list = [...sessions, ...state._cancelledSessions]
      setSessions(list)
      dispatch({ type: ACTIONS.CLEAR_NOTIFICATION })
    }
  }, [state._cancelledSessions])

  useEffect(() => {
    const s = state.timerState
    if (s !== TIMER_STATES.RUNNING && s !== TIMER_STATES.BREAK) return
    const interval = setInterval(() => {
      dispatch({ type: ACTIONS.TICK })
    }, 250)
    return () => clearInterval(interval)
  }, [state.timerState])

  useEffect(() => {
    if ((state.timerState === TIMER_STATES.RUNNING || state.timerState === TIMER_STATES.BREAK)
        && state.remainingSeconds <= 0) {
      dispatch({ type: ACTIONS.COMPLETE, payload: { settings } })
    }
  }, [state.remainingSeconds, state.timerState, settings])

  useEffect(() => {
    if (state._justFinishedType === SESSION_TYPES.SHORT_BREAK || state._justFinishedType === SESSION_TYPES.LONG_BREAK) {
      if (extraBreak) return
    }
  }, [state._justFinishedType, extraBreak])

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        const s = state.timerState
        if (s === TIMER_STATES.IDLE && activeTab === VIEW_TABS.TIMER) {
          handleStartWork()
        } else if (s === TIMER_STATES.RUNNING || s === TIMER_STATES.BREAK) {
          handlePause()
        } else if (s === TIMER_STATES.PAUSED) {
          handleResume()
        }
      } else if (e.code === 'KeyR') {
        e.preventDefault()
        if (state.timerState === TIMER_STATES.IDLE) {
          dispatch({ type: ACTIONS.RESET_IDLE, payload: { settings } })
        }
      } else if (e.code.startsWith('Digit')) {
        const n = parseInt(e.code.replace('Digit', ''))
        if (n >= 1 && n <= 5) {
          updateSettings({ ...settings, accentIndex: n - 1 })
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state.timerState, settings, activeTab, handleStartWork, handlePause, handleResume, updateSettings])

  useEffect(() => {
    const accent = ACCENT_COLORS[settings.accentIndex] || ACCENT_COLORS[0]
    document.documentElement.style.setProperty('--accent-primary', accent.primary)
    document.documentElement.style.setProperty('--accent-secondary', accent.secondary)
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.accentIndex, settings.theme])

  const renderRestorePrompt = () => {
    if (!state.pendingRestore) return null
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>🔔 上次有未完成的番茄</h3>
          <p>检测到上次会话中浏览器被关闭，有一个未完成的番茄钟。</p>
          <p>剩余时间约 {Math.ceil(state.remainingSeconds / 60)} 分钟，要继续吗？</p>
          <div className="btn-group-row">
            <button className="btn btn-primary" onClick={() => dispatch({ type: ACTIONS.ACCEPT_RESTORE })}>
              继续上次
            </button>
            <button className="btn btn-secondary" onClick={() => dispatch({ type: ACTIONS.REJECT_RESTORE })}>
              作废，重新开始
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <img src="/tomato.svg" alt="" className="brand-icon" />
          <h1>番茄钟</h1>
        </div>
        <nav className="tabs">
          {[
            { k: VIEW_TABS.TIMER, label: '⏱ 计时' },
            { k: VIEW_TABS.HISTORY, label: '📋 历史' },
            { k: VIEW_TABS.STATS, label: '📊 统计' },
            { k: VIEW_TABS.SETTINGS, label: '⚙ 设置' },
          ].map(t => (
            <button
              key={t.k}
              className={`tab ${activeTab === t.k ? 'active' : ''}`}
              onClick={() => setActiveTab(t.k)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {activeTab === VIEW_TABS.TIMER && (
          <Timer
            state={state}
            settings={settings}
            onStartWork={handleStartWork}
            onStartBreak={handleStartBreak}
            onPause={handlePause}
            onResume={handleResume}
            onCancel={handleCancel}
            onSetProject={handleSetProject}
            extraBreak={extraBreak}
            onToggleExtraBreak={() => setExtraBreak(!extraBreak)}
          />
        )}
        {activeTab === VIEW_TABS.HISTORY && (
          <SessionList
            sessions={sessions}
            settings={settings}
            onUpdateSession={handleUpdateSession}
            onDeleteSession={handleDeleteSession}
          />
        )}
        {activeTab === VIEW_TABS.STATS && (
          <StatsPanel sessions={sessions} settings={settings} />
        )}
        {activeTab === VIEW_TABS.SETTINGS && (
          <Settings settings={settings} onUpdateSettings={updateSettings} />
        )}
      </main>

      <NotificationManager
        state={state}
        dispatch={dispatch}
        settings={settings}
        justCompletedSession={state._completedSession}
        cancelledSessions={state._cancelledSessions}
        sessions={sessions}
        setSessions={setSessions}
        onCompleteAutoBreak={handleCompleteAutoBreak}
      />

      {renderRestorePrompt()}

      <footer className="app-footer">
        <span>专注当下 · 数据保存在浏览器本地 · 不会上传任何服务器</span>
      </footer>
    </div>
  )
}

export default App
