import React, { useState, useMemo } from 'react'
import { SESSION_TYPES } from '../constants'
import { formatDate, formatDuration, getTypeLabel, exportToCSV } from '../utils'
import { parseISO } from 'date-fns'

const SessionList = ({ sessions, settings, onUpdateSession, onDeleteSession }) => {
  const [filterDate, setFilterDate] = useState('')
  const [filterProject, setFilterProject] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [editProject, setEditProject] = useState('')

  const uniqueDates = useMemo(() => {
    const set = new Set()
    sessions.forEach(s => {
      try {
        const d = parseISO(s.started_at)
        set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
      } catch {}
    })
    return [...set].sort().reverse()
  }, [sessions])

  const filtered = useMemo(() => {
    let list = [...sessions]
    if (filterDate) {
      list = list.filter(s => {
        try {
          const d = parseISO(s.started_at)
          const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          return ds === filterDate
        } catch { return false }
      })
    }
    if (filterProject !== 'all') {
      list = list.filter(s => (s.project || '') === filterProject)
    }
    if (filterType !== 'all') {
      list = list.filter(s => s.type === filterType)
    }
    return list.sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
  }, [sessions, filterDate, filterProject, filterType])

  const statsSummary = useMemo(() => {
    const works = filtered.filter(s => s.type === SESSION_TYPES.WORK)
    const completed = works.filter(s => s.completed)
    let totalSec = 0
    works.forEach(s => {
      if (s.started_at && s.ended_at) {
        totalSec += Math.floor((new Date(s.ended_at) - new Date(s.started_at)) / 1000)
      }
    })
    return { completed: completed.length, totalSec }
  }, [filtered])

  const handleStartEdit = (session) => {
    setEditingId(session.id)
    setEditProject(session.project || '')
  }

  const handleSaveEdit = (id) => {
    onUpdateSession(id, { project: editProject || undefined })
    setEditingId(null)
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>历史记录</h2>
        <button className="btn btn-secondary btn-small" onClick={() => exportToCSV(sessions)}>
          📥 导出 CSV
        </button>
      </div>

      <div className="summary-row">
        <span>共 <strong>{filtered.length}</strong> 条记录，</span>
        <span>完成番茄 <strong>{statsSummary.completed}</strong> 个，</span>
        <span>总时长 <strong>{formatDuration(statsSummary.totalSec)}</strong></span>
      </div>

      <div className="filter-row">
        <div className="filter-item">
          <label>日期</label>
          <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
            <option value="">全部</option>
            {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {settings.enableCategories && (
          <div className="filter-item">
            <label>项目</label>
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
              <option value="all">全部</option>
              <option value="">未分类</option>
              {settings.projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
        <div className="filter-item">
          <label>类型</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">全部</option>
            <option value={SESSION_TYPES.WORK}>工作</option>
            <option value={SESSION_TYPES.SHORT_BREAK}>短休息</option>
            <option value={SESSION_TYPES.LONG_BREAK}>长休息</option>
          </select>
        </div>
        {(filterDate || filterProject !== 'all' || filterType !== 'all') && (
          <button
            className="btn btn-text"
            onClick={() => { setFilterDate(''); setFilterProject('all'); setFilterType('all') }}
          >
            清除筛选
          </button>
        )}
      </div>

      <div className="session-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>暂无记录</p>
            <p className="empty-sub">开始第一个番茄吧！</p>
          </div>
        ) : (
          filtered.map(session => {
            const duration = session.started_at && session.ended_at
              ? Math.floor((new Date(session.ended_at) - new Date(session.started_at)) / 1000)
              : 0
            const isEditing = editingId === session.id
            return (
              <div
                key={session.id}
                className={`session-item type-${session.type} ${session.completed ? 'completed' : 'cancelled'}`}
              >
                <div className="session-icon">
                  {session.type === SESSION_TYPES.WORK ? '🍅' : session.type === SESSION_TYPES.SHORT_BREAK ? '☕' : '🌿'}
                </div>
                <div className="session-main">
                  <div className="session-top">
                    <span className="session-type">{getTypeLabel(session.type)}</span>
                    <span className={`session-status ${session.completed ? 'ok' : 'bad'}`}>
                      {session.completed ? '已完成' : '已取消'}
                    </span>
                  </div>
                  <div className="session-time">{formatDate(session.started_at)} - {formatDate(session.ended_at)}</div>
                  <div className="session-bottom">
                    <span className="session-duration">时长 {formatDuration(duration)}</span>
                    {settings.enableCategories && session.type === SESSION_TYPES.WORK && (
                      isEditing ? (
                        <span className="session-project-edit">
                          <select
                            value={editProject}
                            onChange={(e) => setEditProject(e.target.value)}
                          >
                            <option value="">（未分类）</option>
                            {settings.projects.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <button className="btn btn-text" onClick={() => handleSaveEdit(session.id)}>保存</button>
                          <button className="btn btn-text" onClick={() => setEditingId(null)}>取消</button>
                        </span>
                      ) : (
                        <span className="session-project" onClick={() => handleStartEdit(session)}>
                          📁 {session.project || '（未分类，点击编辑）'}
                        </span>
                      )
                    )}
                  </div>
                </div>
                <button
                  className="session-delete"
                  onClick={() => { if (confirm('确定删除这条记录吗？')) onDeleteSession(session.id) }}
                  title="删除"
                >
                  🗑
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default SessionList
