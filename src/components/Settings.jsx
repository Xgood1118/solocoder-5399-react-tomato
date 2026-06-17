import React, { useState } from 'react'
import { ACCENT_COLORS } from '../constants'

const Settings = ({ settings, onUpdateSettings }) => {
  const [local, setLocal] = useState(settings)
  const [newProject, setNewProject] = useState('')

  const update = (key, value) => {
    const newSettings = { ...local, [key]: value }
    setLocal(newSettings)
    onUpdateSettings(newSettings)
  }

  const addProject = () => {
    const name = newProject.trim()
    if (!name) return
    if (local.projects.includes(name)) {
      alert('项目已存在')
      return
    }
    const newProjects = [...local.projects, name]
    update('projects', newProjects)
    setNewProject('')
  }

  const removeProject = (name) => {
    if (!confirm(`确定删除项目「${name}」？历史记录中的该项目名称会保留。`)) return
    const newProjects = local.projects.filter(p => p !== name)
    update('projects', newProjects)
  }

  const resetSettings = () => {
    if (!confirm('确定恢复默认设置？时长、项目列表、主题等所有配置都会重置。')) return
    const defaults = {
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
    setLocal(defaults)
    onUpdateSettings(defaults)
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>设置</h2>
      </div>

      <div className="settings-section">
        <h3>⏱ 时长设置（分钟）</h3>
        <div className="settings-grid">
          <div className="setting-item">
            <label>工作时长</label>
            <input
              type="number" min="1" max="180"
              value={local.workDuration}
              onChange={(e) => update('workDuration', Math.max(1, parseInt(e.target.value) || 25))}
            />
          </div>
          <div className="setting-item">
            <label>短休息时长</label>
            <input
              type="number" min="1" max="60"
              value={local.shortBreakDuration}
              onChange={(e) => update('shortBreakDuration', Math.max(1, parseInt(e.target.value) || 5))}
            />
          </div>
          <div className="setting-item">
            <label>长休息时长</label>
            <input
              type="number" min="1" max="120"
              value={local.longBreakDuration}
              onChange={(e) => update('longBreakDuration', Math.max(1, parseInt(e.target.value) || 15))}
            />
          </div>
          <div className="setting-item">
            <label>长休息间隔（每 N 个番茄）</label>
            <input
              type="number" min="2" max="10"
              value={local.longBreakInterval}
              onChange={(e) => update('longBreakInterval', Math.max(2, parseInt(e.target.value) || 4))}
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>📁 项目分类</h3>
        <div className="setting-item setting-row">
          <label className="switch-label">
            <input
              type="checkbox"
              checked={local.enableCategories}
              onChange={(e) => update('enableCategories', e.target.checked)}
            />
            <span>启用项目分类</span>
          </label>
          <span className="setting-hint">开启后每个番茄可以选择所属项目</span>
        </div>

        {local.enableCategories && (
          <div className="project-manager">
            <div className="project-add">
              <input
                type="text"
                placeholder="新项目名称"
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addProject()}
              />
              <button className="btn btn-primary" onClick={addProject}>添加</button>
            </div>
            {local.projects.length === 0 ? (
              <p className="setting-hint">还没有项目，添加一个开始分类统计吧</p>
            ) : (
              <div className="project-tags">
                {local.projects.map(p => (
                  <span key={p} className="project-tag">
                    {p}
                    <button className="tag-remove" onClick={() => removeProject(p)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>🔔 提醒设置</h3>
        <div className="setting-item setting-row">
          <label className="switch-label">
            <input
              type="checkbox"
              checked={local.soundEnabled}
              onChange={(e) => update('soundEnabled', e.target.checked)}
            />
            <span>结束提示音</span>
          </label>
        </div>
        <div className="setting-item setting-row">
          <label className="switch-label">
            <input
              type="checkbox"
              checked={local.notificationEnabled}
              onChange={(e) => update('notificationEnabled', e.target.checked)}
            />
            <span>桌面通知</span>
          </label>
          <span className="setting-hint">需要浏览器允许通知权限</span>
        </div>
      </div>

      <div className="settings-section">
        <h3>📅 周起始日</h3>
        <div className="setting-item setting-row">
          <label className="switch-label">
            <input
              type="checkbox"
              checked={local.weekStartsOnMonday}
              onChange={(e) => update('weekStartsOnMonday', e.target.checked)}
            />
            <span>周一作为一周开始（不勾选则周日开始）</span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>🎨 外观</h3>
        <div className="setting-item setting-row">
          <label className="switch-label">
            <input
              type="checkbox"
              checked={local.theme === 'dark'}
              onChange={(e) => update('theme', e.target.checked ? 'dark' : 'light')}
            />
            <span>深色模式</span>
          </label>
        </div>

        <div className="setting-item">
          <label>主题色</label>
          <div className="accent-options">
            {ACCENT_COLORS.map((c, i) => (
              <button
                key={i}
                className={`accent-opt ${local.accentIndex === i ? 'active' : ''}`}
                onClick={() => update('accentIndex', i)}
                title={c.name}
                style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})` }}
              >
                {local.accentIndex === i && '✓'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>⌨ 快捷键</h3>
        <div className="shortcut-list">
          <div className="shortcut-item">
            <kbd>空格</kbd>
            <span>开始 / 暂停 / 继续</span>
          </div>
          <div className="shortcut-item">
            <kbd>R</kbd>
            <span>重置（空闲时）</span>
          </div>
          <div className="shortcut-item">
            <kbd>1 - 5</kbd>
            <span>切换主题色</span>
          </div>
        </div>
      </div>

      <div className="settings-section settings-danger">
        <button className="btn btn-secondary" onClick={resetSettings}>恢复默认设置</button>
      </div>
    </div>
  )
}

export default Settings
