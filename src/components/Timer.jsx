import React from 'react'
import { SESSION_TYPES, TIMER_STATES } from '../constants'
import { formatTime, getTypeLabel } from '../utils'

const Timer = ({
  state,
  settings,
  onStartWork,
  onStartBreak,
  onPause,
  onResume,
  onCancel,
  onSetProject,
  extraBreak = false,
  onToggleExtraBreak,
}) => {
  const { timerState, currentType, totalSeconds, remainingSeconds, currentProject, workCompletedSinceLongBreak } = state

  const progress = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0
  const circumference = 2 * Math.PI * 140
  const dashOffset = circumference * progress

  const statusLabel = () => {
    switch (timerState) {
      case TIMER_STATES.RUNNING: return '专注中'
      case TIMER_STATES.BREAK: return '休息一下'
      case TIMER_STATES.PAUSED: return currentType === SESSION_TYPES.WORK ? '已暂停 · 工作' : '已暂停 · 休息'
      default: return '准备开始'
    }
  }

  const subLabel = () => {
    if (timerState === TIMER_STATES.IDLE) {
      const nextLong = settings.longBreakInterval - workCompletedSinceLongBreak
      return `第 ${workCompletedSinceLongBreak + 1} 个番茄 · ${nextLong} 个后长休息`
    }
    if (timerState === TIMER_STATES.RUNNING || timerState === TIMER_STATES.PAUSED) {
      return `${getTypeLabel(currentType)} · 剩余 ${formatTime(remainingSeconds)}`
    }
    if (timerState === TIMER_STATES.BREAK) {
      return `${getTypeLabel(currentType)} · 剩余 ${formatTime(remainingSeconds)}`
    }
    return ''
  }

  const isRunning = timerState === TIMER_STATES.RUNNING || timerState === TIMER_STATES.BREAK
  const isPaused = timerState === TIMER_STATES.PAUSED
  const isIdle = timerState === TIMER_STATES.IDLE
  const isWorkIdle = isIdle && currentType === SESSION_TYPES.WORK
  const isBreakFinished = isIdle && state._justFinishedType && state._justFinishedType !== SESSION_TYPES.WORK

  return (
    <div className="timer-container">
      <div className="timer-ring-wrap">
        <svg className="timer-ring" width="320" height="320" viewBox="0 0 320 320">
          <circle cx="160" cy="160" r="140" className="ring-bg" />
          <circle
            cx="160" cy="160" r="140"
            className="ring-progress"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 160 160)"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="timer-center">
          <div className="timer-status">{statusLabel()}</div>
          <div className="timer-time">{formatTime(Math.max(0, remainingSeconds))}</div>
          <div className="timer-sub">{subLabel()}</div>
        </div>
      </div>

      {settings.enableCategories && (isIdle || timerState === TIMER_STATES.RUNNING) && (
        <div className="project-select">
          <label className="project-label">
            {timerState === TIMER_STATES.RUNNING ? '当前项目' : '选择项目（可选）'}
          </label>
          <select
            value={currentProject || ''}
            onChange={(e) => onSetProject(e.target.value)}
            disabled={timerState === TIMER_STATES.RUNNING}
            className="project-select-input"
          >
            <option value="">（未分类）</option>
            {settings.projects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      )}

      <div className="timer-controls">
        {isIdle && !isBreakFinished && (
          <button className="btn btn-primary btn-large" onClick={onStartWork}>
            🍅 开始工作
          </button>
        )}

        {isIdle && isBreakFinished && !extraBreak && (
          <div className="btn-group-row">
            <button className="btn btn-primary" onClick={onStartWork}>
              开始下一个番茄
            </button>
            <button className="btn btn-secondary" onClick={() => onStartBreak(true)}>
              再休息一会儿
            </button>
          </div>
        )}

        {isIdle && isBreakFinished && extraBreak && (
          <div className="btn-group-row">
            <button className="btn btn-primary" onClick={onStartWork}>
              开始工作
            </button>
            <button className="btn btn-secondary" onClick={onToggleExtraBreak}>
              结束休息
            </button>
          </div>
        )}

        {(isRunning || isPaused) && (
          <div className="btn-group-row">
            {isRunning && (
              <button className="btn btn-secondary" onClick={onPause}>
                ⏸ 暂停
              </button>
            )}
            {isPaused && (
              <button className="btn btn-primary" onClick={onResume}>
                ▶ 继续
              </button>
            )}
            <button className="btn btn-danger" onClick={onCancel}>
              ⏹ 结束当前
            </button>
          </div>
        )}
      </div>

      {!isIdle && (
        <div className="timer-hint">
          <span className="kbd-hint">空格</span> 暂停/继续
          <span className="kbd-hint-sep">·</span>
          <span className="kbd-hint">R</span> 重置
        </div>
      )}
    </div>
  )
}

export default Timer
