import React, { useMemo } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { computeStats, formatDuration, exportToCSV } from '../utils'

const PIE_COLORS = ['#E07A5F', '#81B29A', '#3D405B', '#F2CC8F', '#A8DADC', '#B5838D', '#F4A261', '#264653']

const StatsPanel = ({ sessions, settings }) => {
  const stats = useMemo(() => computeStats(sessions, settings), [sessions, settings])

  const totalWorkSeconds = stats.projectStats.reduce((sum, p) => sum + p.seconds, 0)

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>数据统计</h2>
        <button className="btn btn-secondary btn-small" onClick={() => exportToCSV(sessions)}>
          📥 导出 CSV
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.todayCount}</div>
          <div className="stat-label">今日番茄</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.weekCount}</div>
          <div className="stat-label">本周番茄</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.streak}</div>
          <div className="stat-label">连续天数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgPerDay}</div>
          <div className="stat-label">日均番茄</div>
        </div>
        <div className="stat-card stat-card-wide">
          <div className="stat-value">{stats.totalCount}</div>
          <div className="stat-label">累计番茄</div>
        </div>
        <div className="stat-card stat-card-wide">
          <div className="stat-value">{formatDuration(totalWorkSeconds)}</div>
          <div className="stat-label">总工作时长</div>
        </div>
      </div>

      <div className="chart-section">
        <h3>最近 7 天</h3>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.last7days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" />
              <YAxis allowDecimals={false} stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                }}
              />
              <Bar dataKey="番茄数" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {settings.enableCategories && stats.projectStats.length > 0 && (
        <div className="chart-section">
          <h3>按项目分布</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={stats.projectStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={110}
                  innerRadius={50}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.projectStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => {
                    const item = props.payload
                    return [`${item.count} 个 · ${formatDuration(item.seconds)}`, item.name]
                  }}
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="project-table">
            <table>
              <thead>
                <tr>
                  <th>项目</th>
                  <th>番茄数</th>
                  <th>时长</th>
                  <th>占比</th>
                </tr>
              </thead>
              <tbody>
                {stats.projectStats.map(p => {
                  const pct = totalWorkSeconds > 0 ? ((p.seconds / totalWorkSeconds) * 100).toFixed(1) : 0
                  return (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td>{p.count}</td>
                      <td>{formatDuration(p.seconds)}</td>
                      <td>{pct}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stats.projectStats.length === 0 && (
        <div className="empty-state">
          <p>还没有统计数据</p>
          <p className="empty-sub">完成几个番茄后这里会有图表</p>
        </div>
      )}
    </div>
  )
}

export default StatsPanel
