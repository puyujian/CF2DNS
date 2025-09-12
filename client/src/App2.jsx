import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import RecordFormModal from './components/RecordForm.jsx'

// 计算 API 基地址与超时
const loc = typeof window !== 'undefined' ? window.location : undefined
const defaultBase = (loc && loc.port === '5173')
  ? 'http://localhost:3000'
  : (loc?.origin || 'http://localhost:3000')
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT_MS || 45000)
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || defaultBase, timeout: API_TIMEOUT })

// 请求拦截：自动附加登录令牌
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('cf2dns:auth')
    if (token) config.headers['x-auth-token'] = token
  } catch (_) {}
  return config
})

function Icon({ name, className = '' }) {
  const common = 'w-4 h-4 ' + className
  switch (name) {
    case 'sun': return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
    case 'moon': return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    case 'cloud': return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 17.58A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 4 16.25"/></svg>
    default: return null
  }
}

export default function App() {
  // 主题/提示
  const [dark, setDark] = useState(false)
  const [toasts, setToasts] = useState([]) // { id, type, message }

  // 数据
  const [zones, setZones] = useState([])
  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [records, setRecords] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [editing, setEditing] = useState(null)
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchTTL, setBatchTTL] = useState('')
  const [batchProxied, setBatchProxied] = useState('keep') // keep|true|false

  // 状态
  const [isLoading, setIsLoading] = useState(false) // 仅用于列表加载/初始化
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('name') // name|type|content|proxied
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // 登录
  const [needLogin, setNeedLogin] = useState(false)
  const [loginPwd, setLoginPwd] = useState('')
  const [loginError, setLoginError] = useState('')
  const [hasToken, setHasToken] = useState(() => {
    try { return Boolean(localStorage.getItem('cf2dns:auth')) } catch (_) { return false }
  })

  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId])

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  function notify(type, message) {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  async function fetchZones() {
    setIsLoading(true); setError('')
    try {
      const { data } = await api.get('/api/zones')
      if (data?.success) setZones(data.result || [])
      else throw new Error(data?.message || '加载域名失败')
    } catch (e) {
      if (e?.response?.status === 401) { setNeedLogin(true); setError('') }
      else { const msg = e?.response?.data?.data?.errors?.[0]?.message || e?.response?.data?.message || e.message || '加载域名失败'; setError(msg); notify('error', msg) }
    } finally { setIsLoading(false) }
  }

  async function fetchRecords(zoneId, background = false) {
    if (!zoneId) return
    if (!background) { setIsLoading(true); setError('') }
    try {
      const { data } = await api.get(`/api/zones/${zoneId}/dns_records`)
      if (data?.success) setRecords(data.result || [])
      else throw new Error(data?.message || '加载解析记录失败')
    } catch (e) {
      if (e?.response?.status === 401) { setNeedLogin(true); setError('') }
      else { const msg = e?.response?.data?.data?.errors?.[0]?.message || e?.response?.data?.message || e.message || '加载解析记录失败'; setError(msg); notify('error', msg) }
    } finally { if (!background) setIsLoading(false) }
  }

  useEffect(() => { fetchZones() }, [])

  function handleSelectZone(e) {
    const id = e.target.value
    setSelectedZoneId(id)
    setRecords([])
    setSelectedIds([])
    setPage(1)
    if (id) fetchRecords(id)
  }

  const visibleRecords = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return records
    return records.filter(r => (r.name || '').toLowerCase().includes(q) || (r.type || '').toLowerCase().includes(q) || (r.content || '').toLowerCase().includes(q))
  }, [records, query])

  const sortedRecords = useMemo(() => {
    const arr = [...visibleRecords]
    const get = (r) => sortKey === 'type' ? (r.type || '') : sortKey === 'content' ? (r.content || '') : sortKey === 'proxied' ? (r.proxied ? 1 : 0) : (r.name || '')
    arr.sort((a, b) => {
      const va = get(a), vb = get(b)
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [visibleRecords, sortKey, sortDir])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedRecords.length / pageSize)), [sortedRecords.length, pageSize])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages])
  useEffect(() => { setPage(1) }, [selectedZoneId, query, sortKey, sortDir, pageSize])
  const pageRecords = useMemo(() => sortedRecords.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize), [sortedRecords, page, pageSize])

  function displayName(r) {
    if (!r?.name) return ''
    const zoneName = selectedZone?.name
    if (!zoneName) return r.name
    if (r.name === zoneName) return '@'
    const suffix = '.' + zoneName
    return r.name.endsWith(suffix) ? r.name.slice(0, -suffix.length) : r.name
  }

  // 名称转换：相对名 -> 绝对名（无需用户输入完整域名）
  function toAbsoluteName(input) {
    const zoneName = selectedZone?.name || ''
    const v = String(input || '').trim()
    if (!v || v === '@') return zoneName
    if (!zoneName) return v
    if (v === zoneName || v.endsWith('.' + zoneName)) return v
    return `${v}.${zoneName}`
  }

  // 新增/修改（无感刷新）
  async function handleUpsert(input) {
    if (!selectedZoneId) return
    try {
      const body = { ...input, name: toAbsoluteName(input.name) }
      if (editing?.id) {
        const { data } = await api.put(`/api/zones/${selectedZoneId}/dns_records/${editing.id}`, body)
        if (!data?.success) throw new Error(data?.message || '修改失败')
        setRecords(prev => prev.map(r => r.id === editing.id ? (data.result || { ...r, ...body }) : r))
        notify('success', '修改成功')
      } else {
        const { data } = await api.post(`/api/zones/${selectedZoneId}/dns_records`, body)
        if (!data?.success) throw new Error(data?.message || '新增失败')
        setRecords(prev => [ ...(data.result ? [data.result] : []), ...prev ])
        notify('success', '添加成功')
      }
      setEditing(null)
      fetchRecords(selectedZoneId, true)
    } catch (e) {
      const msg = e?.response?.data?.data?.errors?.[0]?.message || e?.response?.data?.message || e.message || '操作失败'
      notify('error', msg)
    }
  }

  async function handleDelete(record) {
    if (!selectedZoneId || !record?.id) return
    try {
      const { data } = await api.delete(`/api/zones/${selectedZoneId}/dns_records/${record.id}`)
      if (!data?.success) throw new Error(data?.message || '删除失败')
      setRecords(prev => prev.filter(r => r.id !== record.id))
      setSelectedIds(prev => prev.filter(id => id !== record.id))
      notify('success', '删除成功')
      fetchRecords(selectedZoneId, true)
    } catch (e) {
      const msg = e?.response?.data?.data?.errors?.[0]?.message || e?.response?.data?.message || e.message || '删除失败'
      notify('error', msg)
    }
  }

  async function handleBatchApply(e) {
    e?.preventDefault?.()
    if (!selectedZoneId || !selectedIds.length) return setBatchOpen(false)
    const ttlVal = batchTTL.trim() === '' ? null : Number(batchTTL)
    const proxVal = batchProxied === 'keep' ? null : (batchProxied === 'true')
    setIsLoading(true)
    try {
      for (const id of selectedIds) {
        const r = records.find(x => x.id === id); if (!r) continue
        const body = { type: r.type, name: r.name, content: r.content, ttl: ttlVal ?? (r.ttl ?? 1), proxied: proxVal ?? r.proxied }
        // eslint-disable-next-line no-await-in-loop
        const { data } = await api.put(`/api/zones/${selectedZoneId}/dns_records/${id}`, body)
        if (!data?.success) throw new Error(data?.message || '批量修改失败')
      }
      notify('success', '批量修改成功')
      setBatchOpen(false); setBatchTTL(''); setBatchProxied('keep')
      fetchRecords(selectedZoneId, true)
    } catch (e) {
      const msg = e?.response?.data?.data?.errors?.[0]?.message || e?.response?.data?.message || e.message || '批量修改失败'
      notify('error', msg)
    } finally { setIsLoading(false) }
  }

  async function handleBatchDelete() {
    if (!selectedZoneId || !selectedIds.length) return
    const ok = window.confirm(`确定删除选中的 ${selectedIds.length} 条记录吗？此操作不可撤销！`)
    if (!ok) return
    setIsLoading(true)
    try {
      for (const id of selectedIds) {
        // eslint-disable-next-line no-await-in-loop
        const { data } = await api.delete(`/api/zones/${selectedZoneId}/dns_records/${id}`)
        if (!data?.success) throw new Error(data?.message || '删除失败')
      }
      notify('success', '批量删除成功')
      setSelectedIds([])
      fetchRecords(selectedZoneId, true)
    } catch (e) {
      const msg = e?.response?.data?.data?.errors?.[0]?.message || e?.response?.data?.message || e.message || '批量删除失败'
      notify('error', msg)
    } finally { setIsLoading(false) }
  }

  async function handleLogin(e) {
    e?.preventDefault?.()
    setLoginError('')
    try {
      const { data } = await api.post('/api/auth/login', { password: loginPwd })
      if (!data?.success) throw new Error(data?.message || '登录失败')
      if (data.token) { try { localStorage.setItem('cf2dns:auth', data.token) } catch (_) {} }
      setHasToken(Boolean(data.token)); setNeedLogin(false); setLoginPwd('')
      notify('success', '登录成功')
      await fetchZones(); if (selectedZoneId) await fetchRecords(selectedZoneId)
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || '登录失败'
      setLoginError(msg); notify('error', msg)
    }
  }

  function toggleSelect(id, checked) {
    setSelectedIds(prev => {
      const set = new Set(prev)
      if (checked) set.add(id); else set.delete(id)
      return Array.from(set)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-b border-gray-200 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="cloud" className="text-indigo-600" />
            <h1 className="font-semibold">CF2DNS</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-outline" onClick={() => setDark(v => !v)}>
              <Icon name={dark ? 'sun' : 'moon'} />
            </button>
            <button className="btn btn-outline" onClick={() => setNeedLogin(true)}>{hasToken ? '重新登录' : '登录'}</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-28 md:pb-6">
        {/* 工具栏 */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            <div className="flex gap-3">
              <select value={selectedZoneId} onChange={handleSelectZone} className="select w-full">
                <option value="">选择域名</option>
                {zones.map(z => (<option key={z.id} value={z.id}>{z.name}</option>))}
              </select>
            </div>
            <div className="flex gap-3">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索记录（name/type/content）" className="input w-full"/>
              <select value={sortKey} onChange={e => setSortKey(e.target.value)} className="select">
                <option value="name">名称</option>
                <option value="type">类型</option>
                <option value="content">内容</option>
                <option value="proxied">代理</option>
              </select>
              <button className="btn btn-outline" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>{sortDir === 'asc' ? '升序' : '降序'}</button>
            </div>
            <div className="flex gap-2 justify-start md:justify-end overflow-x-auto no-scrollbar">
              <select value={pageSize} onChange={e => { setPage(1); setPageSize(Number(e.target.value)) }} className="select">
                <option value={25}>每页 25</option>
                <option value={50}>每页 50</option>
                <option value={100}>每页 100</option>
              </select>
              <button className="btn btn-outline" onClick={fetchZones}>刷新域名</button>
              {selectedZoneId && (
                <>
                  <button className="btn btn-primary" onClick={() => fetchRecords(selectedZoneId)}>刷新记录</button>
                  <button className="btn btn-outline" onClick={() => setEditing({})}>添加记录</button>
                  <button className="btn btn-outline" disabled={!selectedIds.length} onClick={() => setBatchOpen(true)}>批量修改</button>
                  <button className="btn btn-danger" disabled={!selectedIds.length} onClick={handleBatchDelete}>批量删除</button>
                </>
              )}
            </div>
          </div>
        </div>

        {!!error && (
          <div className="card text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-200 border border-rose-200 dark:border-rose-800/50">{error}</div>
        )}

        {/* 桌面端表格 */}
        <div className="hidden md:block card p-0 overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="w-10"><input type="checkbox" aria-label="全选"
                  onChange={e => {
                    const checked = e.target.checked
                    if (checked) {
                      const ids = pageRecords.map(r => r.id)
                      setSelectedIds(prev => Array.from(new Set([...prev, ...ids])))
                    } else {
                      const pageSet = new Set(pageRecords.map(r => r.id))
                      setSelectedIds(prev => prev.filter(id => !pageSet.has(id)))
                    }
                  }}
                  checked={pageRecords.length > 0 && pageRecords.every(r => selectedIds.includes(r.id))}
                /></th>
                <th>名称</th>
                <th>类型</th>
                <th>内容</th>
                <th>代理</th>
                <th className="w-40 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {pageRecords.map(r => (
                <tr key={r.id}>
                  <td><input type="checkbox" checked={selectedIds.includes(r.id)} onChange={e => toggleSelect(r.id, e.target.checked)} /></td>
                  <td className="font-medium">{displayName(r)}</td>
                  <td><span className="chip">{r.type}</span></td>
                  <td className="break-all text-sm text-gray-700 dark:text-gray-300">{r.content}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full border select-none ${r.proxied ? 'border-emerald-300 text-emerald-700 dark:text-emerald-200' : 'border-gray-300 text-gray-600 dark:text-gray-300'}`}>
                      {r.proxied ? 'Proxied' : 'Direct'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button className="btn btn-outline px-2 py-1" onClick={() => setEditing(r)}>编辑</button>
                    <button className="btn btn-danger ml-2 px-2 py-1" onClick={() => handleDelete(r)}>删除</button>
                  </td>
                </tr>
              ))}
              {isLoading && !pageRecords.length && (<tr><td colSpan="6" className="px-4 py-6 text-center text-gray-500">加载中...</td></tr>)}
              {!isLoading && !pageRecords.length && (<tr><td colSpan="6" className="px-4 py-10 text-center text-gray-500">{selectedZone ? '暂无记录' : '请选择域名后查看解析记录'}</td></tr>)}
            </tbody>
          </table>
        </div>

        {/* 移动端卡片 */}
        <div className="md:hidden grid gap-3">
          {pageRecords.map(r => (
            <div key={r.id} className="card p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600" checked={selectedIds.includes(r.id)} onChange={e => toggleSelect(r.id, e.target.checked)} />
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-semibold">{r.type || '?'}</span>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{displayName(r)}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 break-all" title={r.content}>{r.content}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border select-none ${r.proxied ? 'border-emerald-300 text-emerald-700 dark:text-emerald-200' : 'border-gray-300 text-gray-600 dark:text-gray-300'}`}>
                  {r.proxied ? 'Proxied' : 'Direct'}
                </span>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button className="btn btn-outline px-2 py-1" onClick={() => setEditing(r)}>编辑</button>
                <button className="btn btn-danger px-2 py-1" onClick={() => handleDelete(r)}>删除</button>
              </div>
            </div>
          ))}
          {isLoading && !pageRecords.length && (
            <div className="card p-4">
              <div className="h-4 w-1/3 skeleton mb-3"></div>
              <div className="h-3 w-2/3 skeleton"></div>
            </div>
          )}
          {!isLoading && !pageRecords.length && (
            <div className="text-center text-gray-500 py-10 card">{selectedZone ? '暂无记录' : '请选择域名后查看解析记录'}</div>
          )}
        </div>

        {/* 分页条 */}
        <div className="flex items-center justify-between">
          <div className="text-sm">共 {sortedRecords.length} 条，页 {page}/{totalPages}</div>
          <div className="flex gap-2">
            <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>上一页</button>
            <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>下一页</button>
          </div>
        </div>

        {/* 移动端粘性批量操作条 */}
        {selectedIds.length > 0 && (
          <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 card flex items-center justify-between px-4 py-3">
            <div className="text-sm">已选 {selectedIds.length} 条</div>
            <div className="flex gap-2">
              <button className="btn btn-outline" onClick={() => setSelectedIds([])}>清空</button>
              <button className="btn btn-primary" onClick={() => setBatchOpen(true)}>批量修改</button>
              <button className="btn btn-danger" onClick={handleBatchDelete}>批量删除</button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur px-4 py-2 shadow-soft">
            <span className="inline-block w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            <span className="text-sm">加载中...</span>
          </div>
        )}

        {!!editing && (
          <RecordFormModal
            initial={editing?.id ? editing : null}
            onCancel={() => setEditing(null)}
            onSubmit={handleUpsert}
          />
        )}

        {!!batchOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="card w-full max-w-md animate-scale-in">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10">
                <h3 className="text-lg font-semibold">批量修改（{selectedIds.length} 条）</h3>
              </div>
              <form onSubmit={handleBatchApply} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">TTL</label>
                  <input value={batchTTL} onChange={e => setBatchTTL(e.target.value)} className="input" placeholder="留空保持不变，1 表示自动" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Proxied</label>
                  <select value={batchProxied} onChange={e => setBatchProxied(e.target.value)} className="select">
                    <option value="keep">保持不变</option>
                    <option value="true">开启</option>
                    <option value="false">关闭</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" className="btn btn-outline" onClick={() => setBatchOpen(false)}>取消</button>
                  <button type="submit" className="btn btn-primary">应用</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {!!toasts.length && (
          <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map(t => (
              <div key={t.id}
                   className={`px-4 py-2 rounded-lg shadow-soft border text-sm animate-slide-up ${t.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/50' : t.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800/50' : 'bg-gray-50 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-200 dark:border-gray-700/50' }`}>
                {t.message}
              </div>
            ))}
          </div>
        )}

        {needLogin && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="card w-full max-w-sm animate-scale-in">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10">
                <h3 className="text-lg font-semibold">管理员登录</h3>
              </div>
              <form onSubmit={handleLogin} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">密码</label>
                  <input type="password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} className="input" placeholder="请输入后台设置的 ADMIN_PASSWORD" autoFocus />
                  {!!loginError && <p className="text-xs text-rose-600 mt-1">{loginError}</p>}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" className="btn btn-outline" onClick={() => setNeedLogin(false)}>取消</button>
                  <button type="submit" className="btn btn-primary">登录</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}


