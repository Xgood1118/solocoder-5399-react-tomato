import { SESSION_TYPES, TIMER_STATES, STORAGE_KEYS } from './constants'
import { saveToStorage, generateId, minutesToSeconds } from './utils'

export const createInitialState = (settings, savedState) => {
  if (savedState && savedState.timerState !== TIMER_STATES.IDLE && savedState.currentSession) {
    return {
      timerState: savedState.timerState,
      currentSession: savedState.currentSession,
      currentType: savedState.currentType,
      totalSeconds: savedState.totalSeconds,
      remainingSeconds: savedState.remainingSeconds,
      workCompletedSinceLongBreak: savedState.workCompletedSinceLongBreak || 0,
      currentProject: savedState.currentProject || '',
      pendingRestore: savedState.timerState === TIMER_STATES.RUNNING && savedState.currentType === SESSION_TYPES.WORK,
      inAppNotification: null,
    }
  }
  return {
    timerState: TIMER_STATES.IDLE,
    currentSession: null,
    currentType: SESSION_TYPES.WORK,
    totalSeconds: minutesToSeconds(settings.workDuration),
    remainingSeconds: minutesToSeconds(settings.workDuration),
    workCompletedSinceLongBreak: 0,
    currentProject: '',
    pendingRestore: false,
    inAppNotification: null,
  }
}

const persistState = (state) => {
  saveToStorage(STORAGE_KEYS.CURRENT_STATE, {
    timerState: state.timerState,
    currentSession: state.currentSession,
    currentType: state.currentType,
    totalSeconds: state.totalSeconds,
    remainingSeconds: state.remainingSeconds,
    workCompletedSinceLongBreak: state.workCompletedSinceLongBreak,
    currentProject: state.currentProject,
  })
}

export const ACTIONS = {
  START_WORK: 'START_WORK',
  START_BREAK: 'START_BREAK',
  PAUSE: 'PAUSE',
  RESUME: 'RESUME',
  CANCEL: 'CANCEL',
  COMPLETE: 'COMPLETE',
  TICK: 'TICK',
  SET_PROJECT: 'SET_PROJECT',
  REJECT_RESTORE: 'REJECT_RESTORE',
  ACCEPT_RESTORE: 'ACCEPT_RESTORE',
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',
  CLEAR_NOTIFICATION: 'CLEAR_NOTIFICATION',
  UPDATE_DURATION: 'UPDATE_DURATION',
  RESET_IDLE: 'RESET_IDLE',
}

export const reducer = (state, action) => {
  let newState
  switch (action.type) {
    case ACTIONS.START_WORK: {
      const { settings, project } = action.payload
      const totalSec = minutesToSeconds(settings.workDuration)
      const now = new Date().toISOString()
      const session = {
        id: generateId(),
        type: SESSION_TYPES.WORK,
        project: settings.enableCategories ? project || '' : undefined,
        started_at: now,
        ended_at: null,
        completed: false,
      }
      newState = {
        ...state,
        timerState: TIMER_STATES.RUNNING,
        currentSession: session,
        currentType: SESSION_TYPES.WORK,
        totalSeconds: totalSec,
        remainingSeconds: totalSec,
        currentProject: project || '',
        pendingRestore: false,
      }
      persistState(newState)
      return newState
    }
    case ACTIONS.START_BREAK: {
      const { settings, isLong } = action.payload
      const totalSec = minutesToSeconds(isLong ? settings.longBreakDuration : settings.shortBreakDuration)
      const type = isLong ? SESSION_TYPES.LONG_BREAK : SESSION_TYPES.SHORT_BREAK
      const now = new Date().toISOString()
      const session = {
        id: generateId(),
        type,
        started_at: now,
        ended_at: null,
        completed: false,
      }
      newState = {
        ...state,
        timerState: TIMER_STATES.BREAK,
        currentSession: session,
        currentType: type,
        totalSeconds: totalSec,
        remainingSeconds: totalSec,
        pendingRestore: false,
      }
      persistState(newState)
      return newState
    }
    case ACTIONS.PAUSE: {
      newState = { ...state, timerState: TIMER_STATES.PAUSED }
      persistState(newState)
      return newState
    }
    case ACTIONS.RESUME: {
      const prevState = state.currentType === SESSION_TYPES.WORK ? TIMER_STATES.RUNNING : TIMER_STATES.BREAK
      newState = { ...state, timerState: prevState }
      persistState(newState)
      return newState
    }
    case ACTIONS.CANCEL: {
      const now = new Date().toISOString()
      const cancelled = state.currentSession
        ? { ...state.currentSession, ended_at: now, completed: false }
        : null
      const cancelledList = cancelled ? [cancelled] : []
      newState = {
        ...state,
        timerState: TIMER_STATES.IDLE,
        currentSession: null,
        currentType: SESSION_TYPES.WORK,
        totalSeconds: minutesToSeconds(action.payload.settings.workDuration),
        remainingSeconds: minutesToSeconds(action.payload.settings.workDuration),
        pendingRestore: false,
        _cancelledSessions: cancelledList,
      }
      persistState(newState)
      return newState
    }
    case ACTIONS.COMPLETE: {
      const now = new Date().toISOString()
      const completed = state.currentSession
        ? { ...state.currentSession, ended_at: now, completed: true }
        : null
      let newWorkCount = state.workCompletedSinceLongBreak
      if (completed && completed.type === SESSION_TYPES.WORK) newWorkCount++
      const nextType = SESSION_TYPES.WORK
      const totalSec = minutesToSeconds(action.payload.settings.workDuration)
      newState = {
        ...state,
        timerState: TIMER_STATES.IDLE,
        currentSession: null,
        currentType: nextType,
        totalSeconds: totalSec,
        remainingSeconds: totalSec,
        workCompletedSinceLongBreak: newWorkCount,
        pendingRestore: false,
        _completedSession: completed,
        _justFinishedType: state.currentType,
      }
      persistState(newState)
      return newState
    }
    case ACTIONS.TICK: {
      if (!state.currentSession || (state.timerState !== TIMER_STATES.RUNNING && state.timerState !== TIMER_STATES.BREAK)) {
        return state
      }
      const startTs = new Date(state.currentSession.started_at).getTime()
      const nowTs = Date.now()
      const elapsed = Math.floor((nowTs - startTs) / 1000)
      const remaining = Math.max(0, state.totalSeconds - elapsed)
      newState = { ...state, remainingSeconds: remaining }
      persistState(newState)
      return newState
    }
    case ACTIONS.SET_PROJECT: {
      newState = { ...state, currentProject: action.payload }
      return newState
    }
    case ACTIONS.REJECT_RESTORE: {
      const now = new Date().toISOString()
      const cancelled = state.currentSession
        ? { ...state.currentSession, ended_at: now, completed: false }
        : null
      const cancelledList = cancelled ? [cancelled] : []
      newState = {
        ...state,
        timerState: TIMER_STATES.IDLE,
        currentSession: null,
        pendingRestore: false,
        _cancelledSessions: cancelledList,
      }
      persistState(newState)
      return newState
    }
    case ACTIONS.ACCEPT_RESTORE: {
      if (!state.currentSession) {
        newState = { ...state, pendingRestore: false }
        return newState
      }
      const startTs = new Date(state.currentSession.started_at).getTime()
      const nowTs = Date.now()
      const elapsed = Math.floor((nowTs - startTs) / 1000)
      const remaining = Math.max(0, state.totalSeconds - elapsed)
      const adjustedStart = new Date(nowTs - (state.totalSeconds - remaining) * 1000).toISOString()
      newState = {
        ...state,
        remainingSeconds: remaining,
        currentSession: { ...state.currentSession, started_at: adjustedStart },
        timerState: TIMER_STATES.RUNNING,
        pendingRestore: false,
      }
      persistState(newState)
      return newState
    }
    case ACTIONS.SHOW_NOTIFICATION: {
      return { ...state, inAppNotification: action.payload }
    }
    case ACTIONS.CLEAR_NOTIFICATION: {
      return { ...state, inAppNotification: null }
    }
    case ACTIONS.UPDATE_DURATION: {
      if (state.timerState !== TIMER_STATES.IDLE) return state
      const totalSec = minutesToSeconds(action.payload)
      return { ...state, totalSeconds: totalSec, remainingSeconds: totalSec }
    }
    case ACTIONS.RESET_IDLE: {
      const totalSec = minutesToSeconds(action.payload.settings.workDuration)
      newState = {
        ...state,
        timerState: TIMER_STATES.IDLE,
        currentSession: null,
        currentType: SESSION_TYPES.WORK,
        totalSeconds: totalSec,
        remainingSeconds: totalSec,
        pendingRestore: false,
      }
      persistState(newState)
      return newState
    }
    default:
      return state
  }
}
