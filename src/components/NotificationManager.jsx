import React, { useEffect, useCallback } from 'react'
import { ACTIONS } from '../reducer'
import { SESSION_TYPES } from '../constants'
import {
  playDingSound,
  showBrowserNotification,
  requestNotificationPermission,
} from '../utils'

const NotificationManager = ({
  state,
  dispatch,
  settings,
  justCompletedSession,
  cancelledSessions,
  sessions,
  setSessions,
  onCompleteAutoBreak,
}) => {
  const showInApp = useCallback((title, body) => {
    dispatch({ type: ACTIONS.SHOW_NOTIFICATION, payload: { title, body } })
    setTimeout(() => {
      dispatch({ type: ACTIONS.CLEAR_NOTIFICATION })
    }, 5000)
  }, [dispatch])

  const notify = useCallback((title, body) => {
    if (settings.soundEnabled) playDingSound()
    if (settings.notificationEnabled) {
      const ok = showBrowserNotification(title, body)
      if (!ok) showInApp(title, body)
    } else {
      showInApp(title, body)
    }
  }, [settings, showInApp])

  useEffect(() => {
    if (!justCompletedSession) return
    if (justCompletedSession.type === SESSION_TYPES.WORK) {
      notify('🍅 番茄完成！', '做得好，现在休息一下吧')
    } else {
      notify('☕ 休息结束', '准备好开始下一个番茄了吗？')
    }
  }, [justCompletedSession, notify])

  useEffect(() => {
    if (!cancelledSessions || cancelledSessions.length === 0) return
    const newList = [...sessions]
    cancelledSessions.forEach(s => newList.push(s))
    setSessions(newList)
    setTimeout(() => {
      dispatch({ type: ACTIONS.CLEAR_TEMP_FIELDS })
    }, 0)
  }, [cancelledSessions, sessions, setSessions, dispatch])

  useEffect(() => {
    if (!justCompletedSession) return
    const newList = [...sessions, justCompletedSession]
    setSessions(newList)
    if (justCompletedSession.type === SESSION_TYPES.WORK) {
      setTimeout(() => onCompleteAutoBreak(), 100)
    }
    setTimeout(() => {
      dispatch({ type: ACTIONS.CLEAR_TEMP_FIELDS })
    }, 0)
  }, [justCompletedSession, sessions, setSessions, onCompleteAutoBreak, dispatch])

  useEffect(() => {
    if (settings.notificationEnabled && 'Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission()
    }
  }, [settings.notificationEnabled])

  if (!state.inAppNotification) return null

  return (
    <div className="in-app-notification">
      <div className="notification-content">
        <strong>{state.inAppNotification.title}</strong>
        <p>{state.inAppNotification.body}</p>
      </div>
      <button
        className="notification-close"
        onClick={() => dispatch({ type: ACTIONS.CLEAR_NOTIFICATION })}
      >
        ×
      </button>
    </div>
  )
}

export default NotificationManager
