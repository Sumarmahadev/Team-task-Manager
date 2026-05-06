import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../api/axios'
import { Layout } from '../components/Layout'
import { useAuth } from '../context/AuthContext'

const STATUS_COLORS = { todo: '#e5e7eb', in_progress: '#93c5fd', done: '#6ee7b7' }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [selected, setSelected] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/projects/').then(({ data }) => {
      setProjects(data)
      if (data.length > 0) setSelected(data[0].id)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!selected) return
    api.get(`/tasks/${selected}/dashboard/`).then(({ data }) => setStats(data))
  }, [selected])

  const pieData = stats
    ? [
        { name: 'To Do', value: stats.by_status.todo, color: STATUS_COLORS.todo },
        { name: 'In Progress', value: stats.by_status.in_progress, color: STATUS_COLORS.in_progress },
        { name: 'Done', value: stats.by_status.done, color: STATUS_COLORS.done },
      ].filter((d) => d.value > 0)
    : []

  const barData = stats?.per_user.map((u) => ({
    name: u.assigned_to__name || u.assigned_to__email,
    Tasks: u.count,
  })) || []

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.name}</p>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 text-sm mb-3">No projects yet.</p>
          <button onClick={() => navigate('/projects')} className="btn-primary">
            Create a project
          </button>
        </div>
      ) : (
        <>
          {/* Project selector */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 mr-2">Project:</label>
            <select
              className="input w-auto inline-block"
              value={selected || ''}
              onChange={(e) => setSelected(Number(e.target.value))}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {stats && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Tasks" value={stats.total} color="bg-gray-50" />
                <StatCard label="To Do" value={stats.by_status.todo} color="bg-gray-50" />
                <StatCard label="In Progress" value={stats.by_status.in_progress} color="bg-blue-50" />
                <StatCard label="Done" value={stats.by_status.done} color="bg-green-50" />
              </div>

              {stats.overdue > 0 && (
                <div className="card p-4 border-l-4 border-red-400 bg-red-50 mb-6">
                  <p className="text-sm font-medium text-red-700">
                    ⚠️ {stats.overdue} overdue task{stats.overdue !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pieData.length > 0 && (
                  <div className="card p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Tasks by Status</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 justify-center mt-2">
                      {pieData.map((d) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                          {d.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {barData.length > 0 && (
                  <div className="card p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Tasks per Member</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="Tasks" fill="#4f6ef7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className={`card p-4 ${color}`}>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
