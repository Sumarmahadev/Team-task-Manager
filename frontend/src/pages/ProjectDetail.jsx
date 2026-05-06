
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/axios'
import { Layout } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import '../css/projectDetail.css'


let stylesInjected = false
function injectStyles() {
  if (stylesInjected) return
  stylesInjected = true
  const el = document.createElement('style')
  el.textContent = CSS
  document.head.appendChild(el)
}

const STATUS_LABELS  = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' }
const PRIORITY_COLORS = { low: 'var(--blue)', medium: 'var(--amber)', high: 'var(--red)' }
const STATUS_COLORS   = { todo: 'var(--muted)', in_progress: 'var(--accent)', done: 'var(--green)' }

function Avatar({ name = '?', size = 26 }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div
      className="pd-avatar"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      title={name}
    >
      {initials}
    </div>
  )
}

function Badge({ label, color }) {
  return (
    <span
      className="pd-badge"
      style={{ background: `${color}22`, color }}
    >
      {label}
    </span>
  )
}


function ConfirmDialog({ title, desc, onConfirm, onCancel, danger = true }) {
  return (
    <div className="pd-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="pd-confirm-modal">
        <div className="pd-confirm-icon">⚠️</div>
        <div className="pd-confirm-title">{title}</div>
        <div className="pd-confirm-desc">{desc}</div>
        <div className="pd-confirm-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          {danger
            ? <button className="pd-btn-danger" onClick={onConfirm}>Delete</button>
            : <button className="btn-primary"   onClick={onConfirm}>Confirm</button>
          }
        </div>
      </div>
    </div>
  )
}
function TaskSkeleton() {
  return (
    <div className="pd-panel">
      {[1,2,3].map(i => (
        <div key={i} className="pd-skeleton-row">
          <div className="pd-skeleton" style={{ width: 80 }} />
          <div style={{ flex: 1 }}>
            <div className="pd-skeleton" style={{ width: '55%', marginBottom: 6 }} />
            <div className="pd-skeleton" style={{ width: '30%', height: 10 }} />
          </div>
          <div className="pd-skeleton" style={{ width: 50, height: 20, borderRadius: 10 }} />
        </div>
      ))}
    </div>
  )
}


export default function ProjectDetail() {
  injectStyles()

  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [project,      setProject]      = useState(null)
  const [tasks,        setTasks]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState('tasks')
  const [statusFilter, setFilter]       = useState('')
  const [updatingIds,  setUpdatingIds]  = useState(new Set())

  /* task modal */
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editTask,      setEditTask]      = useState(null)
  const [taskForm,      setTaskForm]      = useState(BLANK_TASK())
  const [submitting,    setSubmitting]    = useState(false)

  /* confirm dialog */
  const [confirm, setConfirm] = useState(null) // { title, desc, onConfirm }

  function BLANK_TASK() {
    return { title: '', description: '', due_date: '', priority: 'medium', status: 'todo', assigned_to_id: '' }
  }

  const isAdmin = project?.my_role === 'admin'


  const fetchAll = useCallback(async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        api.get(`/projects/${id}/`),
        api.get(`/tasks/${id}/tasks/${statusFilter ? `?status=${statusFilter}` : ''}`),
      ])
      setProject(pRes.data)
      setTasks(tRes.data)
    } catch {
      toast.error('Failed to load project')
      navigate('/projects')
    } finally {
      setLoading(false)
    }
  }, [id, statusFilter, navigate])

  useEffect(() => { fetchAll() }, [fetchAll])

  /* ── Task helpers ── */
  const openNew = () => {
    setEditTask(null)
    setTaskForm(BLANK_TASK())
    setShowTaskModal(true)
  }
  const openEdit = t => {
    setEditTask(t)
    setTaskForm({
      title:          t.title,
      description:    t.description   || '',
      due_date:       t.due_date      || '',
      priority:       t.priority,
      status:         t.status,
      assigned_to_id: t.assigned_to?.id || '',
    })
    setShowTaskModal(true)
  }

  const handleTaskSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    const payload = { ...taskForm, assigned_to_id: taskForm.assigned_to_id || null }
    try {
      if (editTask) await api.patch(`/tasks/${id}/tasks/${editTask.id}/`, payload)
      else          await api.post(`/tasks/${id}/tasks/`, payload)
      toast.success(editTask ? 'Task updated' : 'Task created')
      setShowTaskModal(false)
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save task')
    } finally {
      setSubmitting(false)
    }
  }


  const askConfirm = (title, desc, onConfirm) =>
    setConfirm({ title, desc, onConfirm })

  const handleDelete = taskId =>
    askConfirm('Delete this task?', 'This action cannot be undone.', async () => {
      setConfirm(null)
      try {
        await api.delete(`/tasks/${id}/tasks/${taskId}/`)
        toast.success('Task deleted')
        fetchAll()
      } catch {
        toast.error('Failed to delete')
      }
    })

  const handleStatusChange = async (task, newStatus) => {
    setUpdatingIds(prev => new Set(prev).add(task.id))
    try {
      await api.patch(`/tasks/${id}/tasks/${task.id}/`, { status: newStatus })
      fetchAll()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingIds(prev => { const s = new Set(prev); s.delete(task.id); return s })
    }
  }


  if (loading) {
    return (
      <Layout>
        <div className="pd-root">
          <div className="pd-topbar">
            <div>
              <div className="pd-skeleton" style={{ width: 80, marginBottom: 8 }} />
              <div className="pd-skeleton" style={{ width: 200, height: 18 }} />
            </div>
          </div>
          <div className="pd-content">
            <TaskSkeleton />
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="pd-root">
        
        <div className="pd-topbar">
          <div style={{ minWidth: 0 }}>
            <button className="pd-back" onClick={() => navigate('/projects')}>
              ← Projects
            </button>
            <div className="pd-title">{project.title}</div>
            {project.description && (
              <div className="pd-desc">{project.description}</div>
            )}
          </div>
          {isAdmin && (
            <button className="btn-primary" onClick={openNew} style={{ flexShrink: 0 }}>
              + New Task
            </button>
          )}
        </div>

        <div className="pd-content">
          {/* Tab bar */}
          <div className="pd-tabs">
            {['tasks', 'members'].map(t => (
              <button
                key={t}
                className={`pd-tab${tab === t ? ' active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* ── TASKS TAB ── */}
          {tab === 'tasks' && (
            <>
              {/* Status filters */}
              <div className="pd-filters">
                {['', 'todo', 'in_progress', 'done'].map(s => (
                  <button
                    key={s}
                    className={`pd-pill${statusFilter === s ? ' active' : ''}`}
                    onClick={() => setFilter(s)}
                  >
                    {s === '' ? 'All' : STATUS_LABELS[s]}
                  </button>
                ))}
              </div>

              {/* Task list */}
              <div className="pd-panel">
                {tasks.length === 0 ? (
                  <div className="pd-empty">
                    <div className="pd-empty-icon">📋</div>
                    <div className="pd-empty-text">No tasks found</div>
                    {isAdmin && (
                      <button
                        className="btn-primary"
                        style={{ padding: '7px 16px', fontSize: 12 }}
                        onClick={openNew}
                      >
                        Create first task
                      </button>
                    )}
                  </div>
                ) : tasks.map(task => (
                  <div
                    key={task.id}
                    className={`pd-task-row${updatingIds.has(task.id) ? ' updating' : ''}`}
                  >
                    {/* Status select */}
                    <select
                      className="pd-status-select"
                      value={task.status}
                      style={{ color: STATUS_COLORS[task.status] }}
                      onChange={e => handleStatusChange(task, e.target.value)}
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>

                    {/* Title + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={`pd-task-title${task.status === 'done' ? ' done' : ''}`}
                        style={{ color: task.status === 'done' ? undefined : 'var(--text)' }}
                      >
                        {task.title}
                      </div>
                      <div className="pd-task-meta">
                        {task.assigned_to && (
                          <span className="pd-meta-chip">
                            👤 {task.assigned_to.name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className={`pd-meta-chip${task.is_overdue ? ' overdue' : ''}`}>
                            📅 {task.due_date}{task.is_overdue ? ' · overdue' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge label={PRIORITY_LABELS[task.priority]} color={PRIORITY_COLORS[task.priority]} />

                    {task.assigned_to && <Avatar name={task.assigned_to.name} size={24} />}

                    {isAdmin && (
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button className="pd-btn-edit" onClick={() => openEdit(task)}>Edit</button>
                        <button className="pd-btn-del"  onClick={() => handleDelete(task.id)}>✕</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── MEMBERS TAB ── */}
          {tab === 'members' && (
            <MembersTab
              project={project}
              isAdmin={isAdmin}
              onRefresh={fetchAll}
              askConfirm={askConfirm}
            />
          )}
        </div>
      </div>

   
      {showTaskModal && (
        <div className="pd-overlay" onClick={e => e.target === e.currentTarget && setShowTaskModal(false)}>
          <div className="pd-modal">
            <div className="pd-modal-header">
              <h2 className="pd-modal-title">{editTask ? 'Edit Task' : 'New Task'}</h2>
              <button className="pd-modal-close" onClick={() => setShowTaskModal(false)}>✕</button>
            </div>

            <form onSubmit={handleTaskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Title */}
              <div className="pd-field">
                <label className="pd-field-label">Title</label>
                <input
                  className="input"
                  required
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="What needs to be done?"
                />
              </div>

              {/* Description */}
              <div className="pd-field">
                <label className="pd-field-label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={taskForm.description}
                  onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Add more context… (optional)"
                />
              </div>

              <div className="pd-form-divider" />

              {/* Priority + Status */}
              <div className="pd-grid-2">
                <div className="pd-field">
                  <label className="pd-field-label">⚡ Priority</label>
                  <select className="input" value={taskForm.priority}
                    onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="pd-field">
                  <label className="pd-field-label">📌 Status</label>
                  <select className="input" value={taskForm.status}
                    onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due date + Assign */}
              <div className="pd-grid-2">
                <div className="pd-field">
                  <label className="pd-field-label">📅 Due Date</label>
                  <input type="date" className="input" value={taskForm.due_date}
                    onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                </div>
                <div className="pd-field">
                  <label className="pd-field-label">👤 Assign To</label>
                  <select className="input" value={taskForm.assigned_to_id}
                    onChange={e => setTaskForm({ ...taskForm, assigned_to_id: e.target.value })}>
                    <option value="">— Unassigned —</option>
                    {project.members.map(m => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name}{m.role === 'admin' ? ' (admin)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pd-form-divider" />

              <div className="pd-form-actions">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : editTask ? '✓ Save Changes' : '+ Create Task'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowTaskModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          desc={confirm.desc}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </Layout>
  )
}


function MembersTab({ project, isAdmin, onRefresh, askConfirm }) {
  const [allUsers,  setAllUsers]  = useState([])
  const [search,    setSearch]    = useState('')
  const [addUserId, setAddUserId] = useState('')
  const [addRole,   setAddRole]   = useState('member')
  const [saving,    setSaving]    = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    api.get('/auth/users/').then(({ data }) => setAllUsers(data)).catch(() => {})
  }, [])

  const memberIds = new Set(project.members.map(m => m.user.id))
  const filtered  = allUsers.filter(u =>
    !memberIds.has(u.id) &&
    (u.name.toLowerCase().includes(search.toLowerCase()) ||
     u.email.toLowerCase().includes(search.toLowerCase()))
  )

  const handleAdd = async e => {
    e.preventDefault()
    if (!addUserId) return toast.error('Please select a user')
    setSaving(true)
    try {
      await api.post(`/projects/${project.id}/members/`, {
        user_id: Number(addUserId),
        role: addRole,
      })
      toast.success('Member added!')
      setAddUserId(''); setSearch('')
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add member')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = userId =>
    askConfirm('Remove member?', 'They will lose access to this project.', async () => {
      try {
        await api.delete(`/projects/${project.id}/members/`, { data: { user_id: userId } })
        toast.success('Member removed')
        onRefresh()
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to remove member')
      }
    })

  const selectUser = u => {
    setAddUserId(String(u.id))
    setSearch(u.name)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    
      {isAdmin && (
        <div className="pd-panel" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
            Add Member
          </div>

          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="pd-field">
              <label className="pd-field-label">Search Users</label>
              <input
                ref={searchRef}
                className="input"
                placeholder="Type name or email…"
                value={search}
                onChange={e => { setSearch(e.target.value); setAddUserId('') }}
                autoComplete="off"
              />
            </div>

            {/* Dropdown */}
            {search && !addUserId && (
              <div className="pd-user-dropdown">
                {filtered.length === 0 ? (
                  <div style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12 }}>
                    No users found (or already a member)
                  </div>
                ) : filtered.map(u => (
                  <div
                    key={u.id}
                    className={`pd-user-option${addUserId === String(u.id) ? ' selected' : ''}`}
                    onClick={() => selectUser(u)}
                  >
                    <Avatar name={u.name} size={28} />
                    <div>
                      <div className="pd-user-option-name">{u.name}</div>
                      <div className="pd-user-option-email">{u.email}</div>
                    </div>
                    {addUserId === String(u.id) && (
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent)' }}>✓</span>
                    )}
                  </div>
                ))}
              </div>
            )}

   
            {addUserId && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(124,109,250,.08)',
                border: '1px solid rgba(124,109,250,.2)',
                borderRadius: 8, padding: '8px 12px',
              }}>
                <span style={{ fontSize: 12, color: 'var(--accent)', flex: 1 }}>✓ {search}</span>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12 }}
                  onClick={() => { setAddUserId(''); setSearch(''); searchRef.current?.focus() }}
                >
                  Change
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div className="pd-field" style={{ flex: 1 }}>
                <label className="pd-field-label">Role</label>
                <select className="input" value={addRole} onChange={e => setAddRole(e.target.value)}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={!addUserId || saving}
                className="btn-primary"
                style={{ padding: '9px 20px', opacity: (!addUserId || saving) ? 0.5 : 1, flexShrink: 0 }}
              >
                {saving ? 'Adding…' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="pd-panel">
        <div className="pd-panel-header">
          Team · {project.members.length} member{project.members.length !== 1 ? 's' : ''}
        </div>

        {project.members.map(m => (
          <div key={m.id} className="pd-member-row">
            <Avatar name={m.user.name} size={34} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.user.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{m.user.email}</div>
            </div>

            <span className={`pd-role-badge ${m.role}`}>{m.role}</span>

            {/* FIX: removed `m.role !== 'admin'` so any non-self member can be removed by admin */}
            {isAdmin && (
              <button
                className="pd-member-remove"
                onClick={() => handleRemove(m.user.id)}
                title="Remove member"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}