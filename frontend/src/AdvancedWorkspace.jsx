import { useCallback, useEffect, useState } from 'react'
import api from './api'

const managerRoles = ['Manager', 'Project Manager']
const qaRoles = ['Manager', 'Project Manager', 'QA Tester']
const emptyProject = { name: '', key: '', description: '' }
const emptyRequirement = { requirementId: '', title: '', description: '', acceptanceCriteria: '', priority: 'Medium' }
const emptySprint = { sprintId: '', goal: '', startDate: '', endDate: '' }
const emptyQa = { testCaseId: '', requirement: '', task: '', scenario: '', expectedResult: '' }
const emptyBug = { testExecution: '', bugId: '', summary: '', reproductionSteps: '', expectedResult: '', actualResult: '' }

function AdvancedWorkspace({ user }) {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [projectDetail, setProjectDetail] = useState(null)
  const [readiness, setReadiness] = useState(null)
  const [qaQueue, setQaQueue] = useState([])
  const [testCases, setTestCases] = useState([])
  const [bugs, setBugs] = useState([])
  const [releases, setReleases] = useState([])
  const [developers, setDevelopers] = useState([])
  const [managedUsers, setManagedUsers] = useState([])
  const [developersLoading, setDevelopersLoading] = useState(false)
  const [developersError, setDevelopersError] = useState('')
  const [promotionCandidates, setPromotionCandidates] = useState([])
  const [promotionCandidate, setPromotionCandidate] = useState('')
  const [promotionLoading, setPromotionLoading] = useState(false)
  const [promotionError, setPromotionError] = useState('')
  const [tab, setTab] = useState(user.role === 'Developer' ? 'bugs' : 'overview')
  const [projectForm, setProjectForm] = useState(emptyProject)
  const [requirementForm, setRequirementForm] = useState(emptyRequirement)
  const [sprintForm, setSprintForm] = useState(emptySprint)
  const [qaForm, setQaForm] = useState(emptyQa)
  const [bugForm, setBugForm] = useState(emptyBug)
  const [releaseVersion, setReleaseVersion] = useState('')
  const [fixDraft, setFixDraft] = useState({ bugId: '', fixNotes: '', pullRequestUrl: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const canManage = managerRoles.includes(user.role)
  const canQa = qaRoles.includes(user.role)

  const loadProjects = useCallback(async () => {
    const response = await api.get('/projects')
    const nextProjects = response.data.projects || []
    setProjects(nextProjects)
    setSelectedProject(current => current || nextProjects[0]?._id || '')
  }, [])

  const loadDevelopers = useCallback(async () => {
    if (!canManage) return
    setDevelopersLoading(true)
    setDevelopersError('')
    try {
      const response = await api.get('/advanced/users?mode=all')
      const users = response.data.users || []
      setManagedUsers(users)
      setDevelopers(users.filter(item => item.role === 'Developer'))
    } catch (errorResponse) {
      setDevelopersError(errorResponse.response?.data?.message || 'Unable to load registered Developers.')
    } finally {
      setDevelopersLoading(false)
    }
  }, [canManage])

  const loadPromotionCandidates = useCallback(async () => {
    if (!canManage) return
    setPromotionLoading(true)
    setPromotionError('')
    try {
      const response = await api.get('/advanced/users?mode=promotion')
      setPromotionCandidates(response.data.users || [])
    } catch (errorResponse) {
      setPromotionError(errorResponse.response?.data?.message || 'Unable to load accounts eligible for promotion.')
    } finally {
      setPromotionLoading(false)
    }
  }, [canManage])

  const loadProjectData = useCallback(async () => {
    if (!selectedProject) return
    if (user.role === 'Developer') {
      const bugsResponse = await api.get('/bugs?project=' + selectedProject)
      setBugs(bugsResponse.data.bugs || [])
      return
    }
    const [detailResponse, readinessResponse] = await Promise.all([
      api.get('/projects/' + selectedProject),
      api.get('/reports/readiness?project=' + selectedProject),
    ])
    setProjectDetail(detailResponse.data)
    setReadiness(readinessResponse.data)

    const [bugsResponse, releasesResponse] = await Promise.all([
      api.get('/bugs?project=' + selectedProject),
      api.get('/releases?project=' + selectedProject),
    ])
    setBugs(bugsResponse.data.bugs || [])
    setReleases(releasesResponse.data.releases || [])

    if (canQa) {
      const [queueResponse, casesResponse] = await Promise.all([
        api.get('/qa/queue'),
        api.get('/qa/test-cases?project=' + selectedProject),
      ])
      setQaQueue(queueResponse.data.tasks || [])
      setTestCases(casesResponse.data.testCases || [])
    }
  }, [canQa, selectedProject, user.role])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        await loadProjects()
      } catch (errorResponse) {
        if (active) setError(errorResponse.response?.data?.message || errorResponse.message || 'Unable to load projects.')
      }
    }
    load()
    return () => { active = false }
  }, [loadProjects])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        await loadDevelopers()
      } catch {
        if (active) setDevelopersError('Unable to load registered Developers.')
      }
    }
    load()
    return () => { active = false }
  }, [loadDevelopers])

  useEffect(() => {
    async function load() {
      await loadPromotionCandidates()
    }
    load()
  }, [loadPromotionCandidates])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        await loadProjectData()
      } catch (errorResponse) {
        if (active) setError(errorResponse.response?.data?.message || errorResponse.message || 'Unable to load project data.')
      }
    }
    load()
    return () => { active = false }
  }, [loadProjectData])

  async function submitProject(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/projects', projectForm)
      setProjectForm(emptyProject)
      setNotice('Project created.')
      await loadProjects()
    } catch (errorResponse) {
      setError(errorResponse.response?.data?.message || 'Unable to create project.')
    } finally {
      setBusy(false)
    }
  }

  async function submitRequirement(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/requirements', { ...requirementForm, project: selectedProject })
      setRequirementForm(emptyRequirement)
      setNotice('Requirement created.')
      await loadProjectData()
    } catch (errorResponse) {
      setError(errorResponse.response?.data?.message || 'Unable to create requirement.')
    } finally {
      setBusy(false)
    }
  }

  async function submitSprint(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/sprints', { ...sprintForm, project: selectedProject })
      setSprintForm(emptySprint)
      setNotice('Sprint created.')
      await loadProjectData()
    } catch (errorResponse) {
      setError(errorResponse.response?.data?.message || 'Unable to create sprint.')
    } finally {
      setBusy(false)
    }
  }

  async function approveRelease(releaseId) {
    setBusy(true)
    try {
      await api.patch('/releases/' + releaseId + '/approve', {
        environment: 'QA',
        status: 'Approved',
        notes: 'Approved from QA workspace',
      })
      setNotice('Release approval recorded.')
      await loadProjectData()
    } catch (errorResponse) {
      setError(errorResponse.response?.data?.message || 'Unable to approve release.')
    } finally {
      setBusy(false)
    }
  }

  async function submitTestCase(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await api.post('/qa/test-cases', { ...qaForm, project: selectedProject })
      setQaForm(emptyQa)
      setNotice('Test case created.')
      await loadProjectData()
    } catch (errorResponse) {
      setError(errorResponse.response?.data?.message || 'Unable to create test case.')
    } finally {
      setBusy(false)
    }
  }

  async function recordExecution(testCaseId, status) {
    setBusy(true)
    try {
      const response = await api.post('/qa/executions', {
        testCase: testCaseId,
        environment: 'QA',
        status,
        actualResult: status === 'Pass' ? 'Observed expected result' : 'Observed a failure',
      })
      if (status === 'Fail' && response.data.execution?._id) {
        setBugForm(current => ({ ...current, testExecution: response.data.execution._id }))
      }
      setNotice('Execution recorded.')
      await loadProjectData()
    } catch (errorResponse) {
      setError(errorResponse.response?.data?.message || 'Unable to record execution.')
    } finally {
      setBusy(false)
    }
  }

  async function submitBug(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await api.post('/bugs', { ...bugForm, environment: 'QA', project: selectedProject })
      setBugForm(emptyBug)
      setNotice('Bug created from failed execution.')
      await loadProjectData()
    } catch (errorResponse) {
      setError(errorResponse.response?.data?.message || 'Unable to create bug.')
    } finally {
      setBusy(false)
    }
  }

  async function submitRelease(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await api.post('/releases', { project: selectedProject, version: releaseVersion })
      setReleaseVersion('')
      setNotice('Release created.')
      await loadProjectData()
    } catch (errorResponse) {
      setError(errorResponse.response?.data?.message || 'Unable to create release.')
    } finally {
      setBusy(false)
    }
  }

  async function assignBug(bugId, developer) {
    setBusy(true)
    try {
      await api.patch('/bugs/' + bugId + '/assign', { developer })
      setNotice('Bug assignment updated.')
      await loadProjectData()
    } catch (errorResponse) {
      setError(errorResponse.response?.data?.message || 'Unable to assign bug.')
    } finally {
      setBusy(false)
    }
  }

  async function promoteDeveloper() {
    if (!promotionCandidate) return
    setBusy(true)
    try {
      await api.patch('/advanced/users/' + promotionCandidate + '/promote-developer')
      setPromotionCandidate('')
      setNotice('Account promoted to Developer. It can now be assigned bugs.')
      await Promise.all([loadDevelopers(), loadPromotionCandidates()])
    } catch (errorResponse) {
      setPromotionError(errorResponse.response?.data?.message || 'Unable to promote account.')
    } finally {
      setBusy(false)
    }
  }

  async function changeUserRole(userId, role) {
    setBusy(true)
    setError('')
    try {
      await api.patch('/advanced/users/' + userId + '/role', { role })
      setNotice('User role updated. The new permissions apply on the next request or login.')
      await loadDevelopers()
    } catch (errorResponse) {
      setError(errorResponse.response?.data?.message || 'Unable to update user role.')
    } finally {
      setBusy(false)
    }
  }

  async function changeBugStatus(bugId, status) {
    setBusy(true)
    try {
      await api.patch('/bugs/' + bugId + '/status', { status })
      setNotice('Bug status updated.')
      await loadProjectData()
    } catch (errorResponse) {
      setError(errorResponse.response?.data?.message || 'Unable to update bug status.')
    } finally {
      setBusy(false)
    }
  }

  async function submitFix(event, bugId) {
    event.preventDefault()
    setBusy(true)
    try {
      await api.put('/bugs/' + bugId + '/fix', fixDraft)
      setFixDraft({ bugId: '', fixNotes: '', pullRequestUrl: '' })
      setNotice('Bug fix submitted for QA retest.')
      await loadProjectData()
    } catch (errorResponse) {
      setError(errorResponse.response?.data?.message || 'Unable to submit bug fix.')
    } finally {
      setBusy(false)
    }
  }

  async function retestBug(bugId, status) {
    setBusy(true)
    try {
      await api.post('/bugs/' + bugId + '/retest', {
        status,
        environment: 'QA',
        actualResult: status === 'Pass' ? 'Retest passed' : 'Retest failed',
      })
      setNotice(status === 'Pass' ? 'Bug closed after passing retest.' : 'Bug reopened after failed retest.')
      await loadProjectData()
    } catch (errorResponse) {
      setError(errorResponse.response?.data?.message || 'Unable to retest bug.')
    } finally {
      setBusy(false)
    }
  }

  if (user.role === 'User' || (!projects.length && !canManage)) return null

  return (
    <section className="advanced-workspace tasks-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">DELIVERY WORKSPACE</p>
          <h2>Projects, QA and release readiness</h2>
          <p>Role: {user.role}. Data below is loaded from the MongoDB APIs.</p>
        </div>
        <select aria-label="Select project" value={selectedProject} onChange={event => setSelectedProject(event.target.value)}>
          <option value="">Select a project</option>
          {projects.map(project => <option key={project._id} value={project._id}>{project.key} — {project.name}</option>)}
        </select>
      </div>

      {canManage && (
        <form className="advanced-form" onSubmit={submitProject}>
          <h3>Create project</h3>
          <div className="advanced-form-grid">
            <input required maxLength={150} placeholder="Project name" value={projectForm.name} onChange={event => setProjectForm({ ...projectForm, name: event.target.value })} />
            <input required maxLength={12} placeholder="Key, e.g. APP" value={projectForm.key} onChange={event => setProjectForm({ ...projectForm, key: event.target.value })} />
            <input maxLength={3000} placeholder="Description" value={projectForm.description} onChange={event => setProjectForm({ ...projectForm, description: event.target.value })} />
            <button className="primary-button" disabled={busy}>Create</button>
          </div>
        </form>
      )}

      {canManage && (
        <section className="advanced-form">
          <h3>User management</h3>
          <p>Assign only supported non-privileged roles. Manager and Project Manager privileges are protected.</p>
          <div className="advanced-list">
            {managedUsers.map(managedUser => (
              <div className="advanced-row" key={managedUser._id}>
                <div><strong>{managedUser.name}</strong><p>{managedUser.email}</p></div>
                <select aria-label={'Role for ' + managedUser.name} value={managedUser.role} disabled={busy || managerRoles.includes(managedUser.role) || managedUser._id === user.id} onChange={event => changeUserRole(managedUser._id, event.target.value)}>
                  {managerRoles.includes(managedUser.role) ? <option value={managedUser.role}>{managedUser.role}</option> : ['User', 'Developer', 'QA Tester'].map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
            ))}
            {!managedUsers.length && <p className="empty-state">No registered users found.</p>}
          </div>
        </section>
      )}

      {error && <p className="error-message">{error}</p>}
      {notice && <p className="success-message">{notice}</p>}

      {selectedProject && (
        <>
          <nav className="advanced-tabs" aria-label="Advanced workspace sections">
            {(user.role === 'Developer' ? ['bugs'] : ['overview', 'requirements', 'sprints', 'qa', 'bugs', 'releases']).map(item => (
              <button type="button" key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </nav>

          {tab === 'overview' && (
            <div className="advanced-grid">
              <article className="advanced-card"><span>Tasks</span><strong>{projectDetail?.tasks?.length || 0}</strong></article>
              <article className="advanced-card"><span>Requirements</span><strong>{projectDetail?.requirements?.length || 0}</strong></article>
              <article className="advanced-card"><span>Sprints</span><strong>{projectDetail?.sprints?.length || 0}</strong></article>
              <article className="advanced-card"><span>Ready for QA</span><strong>{readiness?.pendingQa || 0}</strong></article>
              <article className="advanced-card"><span>Reopened defects</span><strong>{readiness?.reopenedDefects || 0}</strong></article>
              <article className="advanced-card"><span>Release ready</span><strong>{readiness?.ready ? 'Yes' : 'No'}</strong></article>
            </div>
          )}

          {tab === 'requirements' && (
            <div>
              {canManage && (
                <form className="advanced-form" onSubmit={submitRequirement}>
                  <h3>Add requirement</h3>
                  <div className="advanced-form-grid">
                    <input required placeholder="Requirement ID" value={requirementForm.requirementId} onChange={event => setRequirementForm({ ...requirementForm, requirementId: event.target.value })} />
                    <input required placeholder="Title" value={requirementForm.title} onChange={event => setRequirementForm({ ...requirementForm, title: event.target.value })} />
                    <input required placeholder="Description" value={requirementForm.description} onChange={event => setRequirementForm({ ...requirementForm, description: event.target.value })} />
                    <input placeholder="Acceptance criteria" value={requirementForm.acceptanceCriteria} onChange={event => setRequirementForm({ ...requirementForm, acceptanceCriteria: event.target.value })} />
                    <button className="primary-button" disabled={busy}>Add</button>
                  </div>
                </form>
              )}
              <div className="advanced-list">
                {(projectDetail?.requirements || []).map(requirement => (
                  <article className="advanced-row" key={requirement._id}>
                    <div><strong>{requirement.requirementId}: {requirement.title}</strong><p>{requirement.description}</p></div>
                    <span className="task-badge">{requirement.status}</span>
                  </article>
                ))}
                {!projectDetail?.requirements?.length && <p className="empty-state">No requirements yet.</p>}
              </div>
            </div>
          )}

          {tab === 'sprints' && (
            <div>
              {canManage && (
                <form className="advanced-form" onSubmit={submitSprint}>
                  <h3>Add sprint</h3>
                  <div className="advanced-form-grid">
                    <input required placeholder="Sprint ID" value={sprintForm.sprintId} onChange={event => setSprintForm({ ...sprintForm, sprintId: event.target.value })} />
                    <input required placeholder="Goal" value={sprintForm.goal} onChange={event => setSprintForm({ ...sprintForm, goal: event.target.value })} />
                    <input required type="date" value={sprintForm.startDate} onChange={event => setSprintForm({ ...sprintForm, startDate: event.target.value })} />
                    <input required type="date" value={sprintForm.endDate} onChange={event => setSprintForm({ ...sprintForm, endDate: event.target.value })} />
                    <button className="primary-button" disabled={busy}>Add</button>
                  </div>
                </form>
              )}
              <div className="advanced-list">
                {(projectDetail?.sprints || []).map(sprint => (
                  <article className="advanced-row" key={sprint._id}>
                    <div><strong>{sprint.sprintId}: {sprint.goal}</strong><p>{new Date(sprint.startDate).toLocaleDateString()} – {new Date(sprint.endDate).toLocaleDateString()}</p></div>
                    <span className="task-badge">{sprint.state}</span>
                  </article>
                ))}
                {!projectDetail?.sprints?.length && <p className="empty-state">No sprints yet.</p>}
              </div>
            </div>
          )}

          {tab === 'qa' && (
            <div>
              <div className="advanced-grid">
                <article className="advanced-card"><span>QA queue</span><strong>{qaQueue.length}</strong><p>Tasks ready for testing</p></article>
                <article className="advanced-card"><span>Test cases</span><strong>{testCases.length}</strong><p>Active cases in this project</p></article>
                <article className="advanced-card"><span>Tester access</span><strong>{canQa ? 'Enabled' : 'Read only'}</strong><p>Execution history is retained</p></article>
              </div>
              {canQa && (
                <form className="advanced-form" onSubmit={submitTestCase}>
                  <h3>Create test case</h3>
                  <div className="advanced-form-grid">
                    <input required placeholder="Test Case ID" value={qaForm.testCaseId} onChange={event => setQaForm({ ...qaForm, testCaseId: event.target.value })} />
                    <select required value={qaForm.requirement} onChange={event => setQaForm({ ...qaForm, requirement: event.target.value })}>
                      <option value="">Requirement</option>
                      {(projectDetail?.requirements || []).map(item => <option key={item._id} value={item._id}>{item.requirementId}</option>)}
                    </select>
                    <select value={qaForm.task} onChange={event => setQaForm({ ...qaForm, task: event.target.value })}>
                      <option value="">Linked task (optional)</option>
                      {(projectDetail?.tasks || []).map(item => <option key={item._id} value={item._id}>{item.title}</option>)}
                    </select>
                    <input required placeholder="Scenario" value={qaForm.scenario} onChange={event => setQaForm({ ...qaForm, scenario: event.target.value })} />
                    <input required placeholder="Expected result" value={qaForm.expectedResult} onChange={event => setQaForm({ ...qaForm, expectedResult: event.target.value })} />
                    <button className="primary-button" disabled={busy}>Create test case</button>
                  </div>
                </form>
              )}
              <div className="advanced-list">
                {testCases.map(testCase => (
                  <article className="advanced-row" key={testCase._id}>
                    <div><strong>{testCase.testCaseId}: {testCase.scenario}</strong><p>{testCase.expectedResult}</p></div>
                    {canQa && <span><button type="button" className="secondary-button" disabled={busy} onClick={() => recordExecution(testCase._id, 'Pass')}>Pass</button>{' '}<button type="button" className="danger-button" disabled={busy} onClick={() => recordExecution(testCase._id, 'Fail')}>Fail</button></span>}
                  </article>
                ))}
              </div>
              {canQa && (
                <form className="advanced-form" onSubmit={submitBug}>
                  <h3>Create bug from failed execution</h3>
                  <div className="advanced-form-grid">
                    <input required placeholder="Failed execution ID" value={bugForm.testExecution} onChange={event => setBugForm({ ...bugForm, testExecution: event.target.value })} />
                    <input required placeholder="Bug ID" value={bugForm.bugId} onChange={event => setBugForm({ ...bugForm, bugId: event.target.value })} />
                    <input required placeholder="Summary" value={bugForm.summary} onChange={event => setBugForm({ ...bugForm, summary: event.target.value })} />
                    <input required placeholder="Reproduction steps" value={bugForm.reproductionSteps} onChange={event => setBugForm({ ...bugForm, reproductionSteps: event.target.value })} />
                    <input required placeholder="Expected result" value={bugForm.expectedResult} onChange={event => setBugForm({ ...bugForm, expectedResult: event.target.value })} />
                    <input required placeholder="Actual result" value={bugForm.actualResult} onChange={event => setBugForm({ ...bugForm, actualResult: event.target.value })} />
                    <button className="primary-button" disabled={busy}>Create bug</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {tab === 'bugs' && (
            <div className="advanced-list">
              {bugs.map(bug => (
                <article className="advanced-row" key={bug._id}>
                  <div className="bug-details">
                    <strong>{bug.bugId}: {bug.summary}</strong>
                    <p>{bug.severity} severity · {bug.priority} priority</p>
                    <p>Execution: {bug.testExecution?._id || bug.testExecution || 'Unavailable'} · Test case: {bug.testCase?.testCaseId || 'Unavailable'}</p>
                    <p>Requirement: {bug.requirement?.requirementId || 'Unavailable'} · Task: {bug.task ? bug.task.title : 'Not linked or task record unavailable'}</p>
                    {bug.fixNotes && <p>Fix notes: {bug.fixNotes}</p>}
                    {bug.pullRequestUrl && <p>PR: <a href={bug.pullRequestUrl} target="_blank" rel="noreferrer">{bug.pullRequestUrl}</a></p>}
                    {canManage && (
                      <div className="bug-controls">
                        <label>Developer
                          <select aria-label={'Assign developer for ' + bug.bugId} value={bug.assignedDeveloper?._id || ''} disabled={busy || developersLoading || Boolean(developersError)} onChange={event => assignBug(bug._id, event.target.value)}>
                            <option value="">{developersLoading ? 'Loading Developers...' : 'Assign developer'}</option>
                            {developers.map(developer => <option key={developer._id} value={developer._id}>{developer.name} ({developer.email})</option>)}
                          </select>
                          {developersError && <small className="error-message">{developersError} <button type="button" onClick={loadDevelopers}>Retry</button></small>}
                          {!developersLoading && !developersError && !developers.length && <small className="empty-state">No registered Developer accounts found.</small>}
                        </label>
                        <small className="empty-state">Status changes follow the assigned Developer and QA workflow.</small>
                      </div>
                    )}
                    {user.role === 'Developer' && bug.assignedDeveloper?._id === user.id && ['Assigned', 'Reopened'].includes(bug.status) && (
                      <button type="button" className="secondary-button" disabled={busy} onClick={() => changeBugStatus(bug._id, 'In Progress')}>Start fix</button>
                    )}
                    {user.role === 'Developer' && bug.assignedDeveloper?._id === user.id && bug.status === 'In Progress' && (
                      <form className="bug-fix-form" onSubmit={event => submitFix(event, bug._id)}>
                        <input required placeholder="Fix notes" value={fixDraft.bugId === bug._id ? fixDraft.fixNotes : ''} onChange={event => setFixDraft({ bugId: bug._id, fixNotes: event.target.value, pullRequestUrl: fixDraft.bugId === bug._id ? fixDraft.pullRequestUrl : '' })} />
                        <input placeholder="Pull-request URL" value={fixDraft.bugId === bug._id ? fixDraft.pullRequestUrl : ''} onChange={event => setFixDraft({ bugId: bug._id, fixNotes: fixDraft.bugId === bug._id ? fixDraft.fixNotes : '', pullRequestUrl: event.target.value })} />
                        <button className="primary-button" disabled={busy}>Submit fix</button>
                      </form>
                    )}
                    {user.role === 'Developer' && bug.assignedDeveloper?._id === user.id && bug.status === 'Fixed' && (
                      <button type="button" className="primary-button" disabled={busy} onClick={() => changeBugStatus(bug._id, 'Ready for Retest')}>Send to QA retest</button>
                    )}
                    {canQa && bug.status === 'Ready for Retest' && (
                      <div className="bug-controls">
                        <button type="button" className="primary-button" disabled={busy} onClick={() => retestBug(bug._id, 'Pass')}>Retest: Pass</button>
                        <button type="button" className="danger-button" disabled={busy} onClick={() => retestBug(bug._id, 'Fail')}>Retest: Fail</button>
                      </div>
                    )}
                  </div>
                  <span className="task-badge">{bug.status}</span>
                </article>
              ))}
              {canManage && !developersLoading && !developers.length && !developersError && (
                <div className="advanced-form">
                  <h3>Promote an existing account</h3>
                  <p className="empty-state">No Developer accounts are registered. Promotion preserves the selected account's tasks and history.</p>
                  <div className="advanced-form-grid">
                    <select aria-label="Account to promote" value={promotionCandidate} disabled={busy || promotionLoading || Boolean(promotionError)} onChange={event => setPromotionCandidate(event.target.value)}>
                      <option value="">{promotionLoading ? 'Loading eligible accounts...' : 'Select existing User account'}</option>
                      {promotionCandidates.map(candidate => <option key={candidate._id} value={candidate._id}>{candidate.name} ({candidate.email})</option>)}
                    </select>
                    <button type="button" className="primary-button" disabled={busy || promotionLoading || !promotionCandidate} onClick={promoteDeveloper}>Promote to Developer</button>
                  </div>
                  {promotionError && <p className="error-message">{promotionError} <button type="button" onClick={loadPromotionCandidates}>Retry</button></p>}
                  {!promotionLoading && !promotionError && !promotionCandidates.length && <p className="empty-state">No User accounts are eligible for promotion.</p>}
                </div>
              )}
              {!bugs.length && <p className="empty-state">No bugs reported for this project.</p>}
            </div>
          )}

          {tab === 'releases' && (
            <div>
              {canManage && (
                <form className="advanced-form" onSubmit={submitRelease}>
                  <h3>Create release</h3>
                  <div className="advanced-form-grid">
                    <input required placeholder="Release version, e.g. 1.0.0" value={releaseVersion} onChange={event => setReleaseVersion(event.target.value)} />
                    <button className="primary-button" disabled={busy}>Create release</button>
                  </div>
                </form>
              )}
              <div className="advanced-list">
              {releases.map(release => (
                <article className="advanced-row" key={release._id}>
                  <div><strong>{release.version}</strong><p>Readiness: {readiness?.ready ? 'Ready' : 'Pending'}</p></div>
                  <button type="button" className="secondary-button" disabled={!canQa || busy} onClick={() => approveRelease(release._id)}>Approve QA</button>
                </article>
              ))}
              {!releases.length && <p className="empty-state">No releases created for this project.</p>}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default AdvancedWorkspace
