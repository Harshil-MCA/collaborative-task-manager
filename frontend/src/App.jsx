
import { useCallback, useEffect, useState } from 'react'
import api from './api'
import './App.css'
import AdvancedWorkspace from './AdvancedWorkspace'

const emptyForm = {
  title: '',
  description: '',
  assignee: '',
  priority: 'Medium',
  dueDate: '',
}

function App() {
  const [darkMode, setDarkMode] = useState(false)
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [tasks, setTasks] = useState([])
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  })
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const isManager = user?.role === 'Manager'

  const loadDashboard = useCallback(async () => {
    const response = await api.get('/tasks/dashboard')
    setTasks(response.data.tasks || [])
    setCounts(response.data.counts || {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
    })
  }, [])

  const loadUsers = useCallback(async () => {
    const response = await api.get('/tasks/users')
    setUsers(response.data.users || [])
  }, [])

  // Restore the login session when the page is refreshed.
  useEffect(() => {
    let active = true

    async function restoreSession() {
      const token = localStorage.getItem('token')

      if (!token) {
        if (active) setLoading(false)
        return
      }

      try {
        const response = await api.get('/auth/me')
        if (active) setUser(response.data.user)
      } catch {
        localStorage.removeItem('token')
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    restoreSession()

    return () => {
      active = false
    }
  }, [])

  // Load real tasks after authentication.
  useEffect(() => {
    if (!user) {
      return
    }

    let active = true

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const response = await api.get('/tasks/dashboard')

        if (active) {
          setTasks(response.data.tasks || [])
          setCounts(response.data.counts || {
            total: 0,
            pending: 0,
            inProgress: 0,
            completed: 0,
          })
        }

        if (user.role === 'Manager') {
          const userResponse = await api.get('/tasks/users')
          if (active) setUsers(userResponse.data.users || [])
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
            'Could not load your dashboard. Please try again.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [user])

  async function handleAuth(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)

    try {
      const endpoint =
        authMode === 'login' ? '/auth/login' : '/auth/register'

      const payload =
        authMode === 'login'
          ? {
              email: authForm.email.trim(),
              password: authForm.password,
            }
          : {
              name: authForm.name.trim(),
              email: authForm.email.trim(),
              password: authForm.password,
            }

      const response = await api.post(endpoint, payload)

      localStorage.setItem('token', response.data.token)
      setUser(response.data.user)
      setAuthForm({ name: '', email: '', password: '' })
      setNotice(`Welcome, ${response.data.user.name}!`)
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (err.request && 'Unable to reach the authentication server. Check that the backend is running and the browser origin is allowed.') ||
        'Authentication failed. Check your details and try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
    setTasks([])
    setUsers([])
    setCounts({
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
    })
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setNotice('You have logged out.')
  }

  function openCreateForm() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setError('')
    setNotice('')
  }

  function openEditForm(task) {
    setForm({
      title: task.title || '',
      description: task.description || '',
      assignee: task.assignee?._id || task.assignee?.id || '',
      priority: task.priority || 'Medium',
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().slice(0, 10)
        : '',
    })
    setEditingId(task._id || task.id)
    setShowForm(true)
    setError('')
    setNotice('')
  }

  async function handleTaskSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        dueDate: form.dueDate || null,
      }

      if (!editingId) {
        payload.assignee = form.assignee
        await api.post('/tasks', payload)
        setNotice('Task created and assigned successfully.')
      } else {
        payload.assignee = form.assignee
        await api.put(`/tasks/${editingId}`, payload)
        setNotice('Task updated successfully.')
      }

      setForm(emptyForm)
      setEditingId(null)
      setShowForm(false)
      await loadDashboard()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to save the task. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(taskId, status) {
    setError('')
    setNotice('')

    try {
      await api.patch(`/tasks/${taskId}/status`, { status })
      setNotice('Task status updated.')
      await loadDashboard()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to update task status.'
      )
    }
  }

  async function deleteTask(taskId) {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return
    }

    setError('')
    setNotice('')

    try {
      await api.delete(`/tasks/${taskId}`)
      setNotice('Task deleted successfully.')
      await loadDashboard()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to delete this task.'
      )
    }
  }

  return (
    <div className={darkMode ? 'app dark' : 'app'}>
      <header className="navbar">
        <div className="brand">
          <span className="brand-icon">✓</span>
          <span>TaskFlow</span>
        </div>

        <div className="nav-actions">
          <span className="status-label">
            {user ? `${user.name} · ${user.role}` : 'Collaborative Task Manager'}
          </span>

          <button
            className="theme-toggle"
            onClick={() => setDarkMode(value => !value)}
            type="button"
          >
            {darkMode ? '☀ Light Mode' : '☾ Dark Mode'}
          </button>

          {user && (
            <button className="secondary-button" onClick={logout} type="button">
              Logout
            </button>
          )}
        </div>
      </header>

      {!user ? (
        <main className="auth-page">
          <section className="welcome">
            <p className="eyebrow">YOUR WORKSPACE</p>
            <h1>Manage work. <span>Achieve more.</span></h1>
            <p className="subtitle">
              Sign in to manage tasks and collaborate with your team.
            </p>
          </section>

          <section className="auth-card">
            <div className="auth-tabs">
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => {
                  setAuthMode('login')
                  setError('')
                  setNotice('')
                }}
              >
                Login
              </button>

              <button
                type="button"
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => {
                  setAuthMode('register')
                  setError('')
                  setNotice('')
                }}
              >
                Sign up
              </button>
            </div>

            <h2>{authMode === 'login' ? 'Welcome back' : 'Create an account'}</h2>
            <p className="subtitle">
              {authMode === 'login'
                ? 'Enter your account details to continue.'
                : 'New accounts are registered with the User role.'}
            </p>

            <form onSubmit={handleAuth}>
              {authMode === 'register' && (
                <div className="form-group">
                  <label htmlFor="auth-name">Full name</label>
                  <input
                    id="auth-name"
                    required
                    maxLength={80}
                    value={authForm.name}
                    onChange={event =>
                      setAuthForm({ ...authForm, name: event.target.value })
                    }
                    placeholder="Enter your name"
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={authForm.email}
                  onChange={event =>
                    setAuthForm({ ...authForm, email: event.target.value })
                  }
                  placeholder="you@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={authMode === 'register' ? 8 : undefined}
                  maxLength={72}
                  value={authForm.password}
                  onChange={event =>
                    setAuthForm({ ...authForm, password: event.target.value })
                  }
                  placeholder={
                    authMode === 'register'
                      ? 'At least 8 characters'
                      : 'Enter your password'
                  }
                />
              </div>

              {error && <p className="error-message">{error}</p>}
              {notice && <p className="success-message">{notice}</p>}

              <button className="primary-button full-width" disabled={saving}>
                {saving
                  ? 'Please wait...'
                  : authMode === 'login'
                    ? 'Login'
                    : 'Create account'}
              </button>
            </form>
          </section>
        </main>
      ) : (
        <main className="main-content">
          <section className="welcome">
            <p className="eyebrow">WORKSPACE OVERVIEW</p>
            <h1>
              Welcome back, <span>{user.name}.</span>
            </h1>
            <p className="subtitle">
              {isManager
                ? 'Create tasks, assign work, and monitor your team’s progress.'
                : 'View your assigned tasks and keep your progress up to date.'}
            </p>
          </section>

          {error && <p className="error-message">{error}</p>}
          {notice && <p className="success-message">{notice}</p>}

          <section className="stats">
            <article className="stat-card">
              <p>Total Tasks</p>
              <h2>{counts.total}</h2>
              <span>Tasks in your workspace</span>
            </article>

            <article className="stat-card">
              <p>In Progress</p>
              <h2>{counts.inProgress}</h2>
              <span>Tasks currently underway</span>
            </article>

            <article className="stat-card">
              <p>Completed</p>
              <h2>{counts.completed}</h2>
              <span>Finished tasks</span>
            </article>
          </section>

          <AdvancedWorkspace user={user} />

          {isManager && (
            <section className="tasks-panel">
              <div className="panel-heading">
                <div>
                  <h2>{editingId ? 'Edit task' : 'Task management'}</h2>
                  <p>Create tasks and assign them to registered users.</p>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={showForm ? () => {
                    setShowForm(false)
                    setEditingId(null)
                    setForm(emptyForm)
                    setError('')
                  } : openCreateForm}
                >
                  {showForm ? 'Cancel' : '+ New Task'}
                </button>
              </div>

              {showForm && (
                <form className="task-form" onSubmit={handleTaskSubmit}>
                  <div className="form-group">
                    <label htmlFor="task-title">Task title</label>
                    <input
                      id="task-title"
                      required
                      maxLength={150}
                      value={form.title}
                      onChange={event =>
                        setForm({ ...form, title: event.target.value })
                      }
                      placeholder="e.g. Prepare project report"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-description">Description</label>
                    <textarea
                      id="task-description"
                      rows={3}
                      maxLength={3000}
                      value={form.description}
                      onChange={event =>
                        setForm({ ...form, description: event.target.value })
                      }
                      placeholder="Describe the task"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-assignee">Assign to user</label>
                    <select
                      id="task-assignee"
                      required
                      value={form.assignee}
                      onChange={event =>
                        setForm({ ...form, assignee: event.target.value })
                      }
                    >
                      <option value="">Select a user</option>
                      {users.map(item => (
                        <option key={item._id || item.id} value={item._id || item.id}>
                          {item.name} ({item.email})
                        </option>
                      ))}
                    </select>
                    {users.length === 0 && (
                      <small>No registered User accounts are available yet.</small>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-priority">Priority</label>
                    <select
                      id="task-priority"
                      value={form.priority}
                      onChange={event =>
                        setForm({ ...form, priority: event.target.value })
                      }
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-due-date">Due date (optional)</label>
                    <input
                      id="task-due-date"
                      type="date"
                      value={form.dueDate}
                      onChange={event =>
                        setForm({ ...form, dueDate: event.target.value })
                      }
                    />
                  </div>

                  {error && <p className="error-message">{error}</p>}

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={saving || users.length === 0}
                  >
                    {saving
                      ? 'Saving...'
                      : editingId
                        ? 'Save changes'
                        : 'Create and assign task'}
                  </button>
                </form>
              )}
            </section>
          )}

          <section className="tasks-panel">
            <div className="panel-heading">
              <div>
                <h2>{isManager ? 'Tasks you created' : 'My assigned tasks'}</h2>
                <p>
                  {isManager
                    ? 'Monitor the status of tasks assigned to your team.'
                    : 'Update the status as you work through your assignments.'}
                </p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={async () => {
                  setError('')
                  try {
                    await loadDashboard()
                    if (isManager) await loadUsers()
                    setNotice('Dashboard refreshed.')
                  } catch {
                    setError('Could not refresh the dashboard.')
                  }
                }}
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="loading-message">Loading your tasks...</p>
            ) : tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <h3>No tasks yet</h3>
                <p>
                  {isManager
                    ? 'Create a task and assign it to a registered user.'
                    : 'Tasks assigned to you will appear here.'}
                </p>
              </div>
            ) : (
              <div className="task-list">
                {tasks.map(task => {
                  const taskId = task._id || task.id

                  return (
                    <article className="task-item" key={taskId}>
                      <div className="task-top">
                        <div>
                          <h3>{task.title}</h3>
                          <p className="task-description">
                            {task.description || 'No description provided.'}
                          </p>
                        </div>
                        <span className="task-badge">{task.status}</span>
                      </div>

                      <div className="task-meta">
                        <span className="task-badge">
                          Priority: {task.priority || 'Medium'}
                        </span>
                        {task.dueDate && (
                          <span className="task-badge">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {isManager && task.assignee && (
                          <span className="task-badge">
                            Assigned to: {task.assignee.name}
                          </span>
                        )}
                        {!isManager && task.createdBy && (
                          <span className="task-badge">
                            Created by: {task.createdBy.name}
                          </span>
                        )}
                      </div>

                      <div className="task-actions">
                        <label>
                          Status{' '}
                          <select
                            aria-label={`Status for ${task.title}`}
                            value={task.status}
                            onChange={event =>
                              updateStatus(taskId, event.target.value)
                            }
                          >
                            <option>Pending</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                          </select>
                        </label>

                        {isManager && (
                          <>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => openEditForm(task)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger-button"
                              onClick={() => deleteTask(taskId)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </main>
      )}

      <footer>TaskFlow · Collaborative Task Manager</footer>
    </div>
  )
}

export default App
