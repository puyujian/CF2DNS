import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

// Compute API base URL for both dev and production:
// - In Vite dev (port 5173), default to http://localhost:3000
// - In production (served by the same Express), use same-origin
// - Allow override via VITE_API_BASE
const loc = typeof window !== 'undefined' ? window.location : undefined
const defaultBase = (loc && loc.port === '5173')
  ? 'http://localhost:3000'
  : (loc?.origin || 'http://localhost:3000')
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || defaultBase,
  timeout: 15000,
})

function Icon({ name, className = '' }) {
  const common = 'w-4 h-4 ' + className
  switch (name) {
    case 'plus':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
      )
    case 'edit':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
      )
    case 'trash':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      )
    case 'moon':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      )
    case 'sun':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
      )
    case 'cloud':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 17.58A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 4 16.25"/></svg>
      )
    default:
      return null
  }
}

function RecordForm({ initial, onCancel, onSubmit }) {
  const [type, setType] = useState(initial?.type || 'A')
  const [name, setName] = useState(initial?.name || '')
  const [content, setContent] = useState(initial?.content || '')
  const [ttl, setTtl] = useState(initial?.ttl ?? 1) // 1 = auto
  const [proxied, setProxied] = useState(initial?.proxied ?? false)

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({ type, name, content, ttl: Number(ttl), proxied })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="card w-full max-w-xl animate-scale-in">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <h3 className="text-lg font-semibold">{initial ? '修改解析记录' : '添加解析记录'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                {['A','AAAA','CNAME','TXT','MX','NS','SRV','PTR','CAA'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600" placeholder="@ 或子域名"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Content</label>
              <input value={content} onChange={e => setContent(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600" placeholder="目标值 (IP/域名/文本)"/>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">TTL</label>
              <input type="number" min={1} value={ttl} onChange={e => setTtl(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"/>
              <p className="text-xs text-gray-500 mt-1">1 表示自动</p>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input id="proxied" type="checkbox" className="rounded border-gray-300 dark:border-gray-600" checked={proxied} onChange={e => setProxied(e.target.checked)} />
              <label htmlFor="proxied">Proxied</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="btn btn-outline">取消</button>
            <button type="submit" className="btn btn-primary">保存</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [zones, setZones] = useState([])
  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [dnsRecords, setDnsRecords] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [dark, setDark] = useState(false)

  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId])

  // Load zones on mount
  useEffect(() => {
    // Initialize dark mode from storage or system preference
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialDark = saved ? saved === 'dark' : prefersDark
    setDark(initialDark)
    document.documentElement.classList.toggle('dark', initialDark)

    async function loadZones() {
      setIsLoading(true)
      setError('')
      try {
        const { data } = await api.get('/api/zones')
        if (data?.success) {
          setZones(data.result || [])
        } else {
          throw new Error(JSON.stringify(data))
        }
      } catch (e) {
        setError(e.message || '加载域名列表失败')
      } finally {
        setIsLoading(false)
      }
    }
    loadZones()
  }, [])

  // Load DNS records when zone changes
  useEffect(() => {
    if (!selectedZoneId) {
      setDnsRecords([])
      return
    }
    async function loadRecords() {
      setIsLoading(true)
      setError('')
      try {
        const { data } = await api.get(`/api/zones/${selectedZoneId}/dns_records`)
        if (data?.success) {
          setDnsRecords(data.result || [])
        } else {
          throw new Error(JSON.stringify(data))
        }
      } catch (e) {
        setError(e.message || '加载解析记录失败')
      } finally {
        setIsLoading(false)
      }
    }
    loadRecords()
  }, [selectedZoneId])

  const [editing, setEditing] = useState(null) // null | record object | 'create'

  async function refreshRecords() {
    if (!selectedZoneId) return
    try {
      const { data } = await api.get(`/api/zones/${selectedZoneId}/dns_records`)
      if (data?.success) setDnsRecords(data.result || [])
    } catch (e) {
      // ignore here
    }
  }

  async function handleDelete(record) {
    if (!selectedZoneId) return
    if (!window.confirm(`确认删除记录：${record.type} ${record.name} -> ${record.content} ?`)) return
    setIsLoading(true)
    setError('')
    try {
      const { data } = await api.delete(`/api/zones/${selectedZoneId}/dns_records/${record.id}`)
      if (!data?.success) throw new Error('删除失败')
      await refreshRecords()
    } catch (e) {
      setError(e.message || '删除失败')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUpsert(form) {
    if (!selectedZoneId) return
    setIsLoading(true)
    setError('')
    try {
      if (editing && editing.id) {
        const { data } = await api.put(`/api/zones/${selectedZoneId}/dns_records/${editing.id}`, form)
        if (!data?.success) throw new Error('修改失败')
      } else {
        const { data } = await api.post(`/api/zones/${selectedZoneId}/dns_records`, form)
        if (!data?.success) throw new Error('添加失败')
      }
      setEditing(null)
      await refreshRecords()
    } catch (e) {
      setError(e.message || '保存失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg">
        <div className="container py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 backdrop-blur">
              <Icon name="cloud" className="w-5 h-5" />
            </span>
            <h1 className="text-lg md:text-xl font-semibold">Cloudflare DNS 解析管理</h1>
          </div>
          <button
            className="btn btn-outline text-white border-white/40 hover:bg-white/10"
            onClick={() => {
              const next = !dark
              setDark(next)
              document.documentElement.classList.toggle('dark', next)
              localStorage.setItem('theme', next ? 'dark' : 'light')
            }}
            aria-label="切换主题"
          >
            <Icon name={dark ? 'sun' : 'moon'} />
            <span className="hidden sm:inline">{dark ? '浅色' : '深色'}</span>
          </button>
        </div>
      </header>

      <main className="container py-6 md:py-8">
        <div className="card p-4 md:p-6 mb-6 animate-slide-up">
          <label className="block text-sm font-medium mb-2">选择域名</label>
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <select
              value={selectedZoneId}
              onChange={e => setSelectedZoneId(e.target.value)}
              className="w-full md:w-1/2 border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            >
              <option value="">请选择一个域名</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
            <button
              onClick={() => setEditing({})}
              disabled={!selectedZoneId}
              className="btn btn-primary disabled:opacity-50"
            >
              <Icon name="plus" /> 添加新记录
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900/50">
            {String(error)}
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto card animate-slide-up">
          <table className="table min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Content</th>
                <th>Proxied</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dnsRecords.map(r => (
                <tr key={r.id}>
                  <td><span className="chip">{r.type}</span></td>
                  <td className="font-medium">{r.name}</td>
                  <td className="text-gray-700 dark:text-gray-300">{r.content}</td>
                  <td>
                    <span className={`chip ${r.proxied ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' : ''}`}>
                      {r.proxied ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="space-x-2">
                    <button className="btn btn-outline" onClick={() => setEditing(r)}>
                      <Icon name="edit" /> 修改
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(r)}>
                      <Icon name="trash" /> 删除
                    </button>
                  </td>
                </tr>
              ))}
              {!dnsRecords.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">{selectedZone ? '暂无记录' : '请选择域名后查看解析记录'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="md:hidden grid gap-3 animate-slide-up">
          {dnsRecords.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="chip">{r.type}</span>
                  <span className="text-sm text-gray-500">{r.proxied ? 'Proxied' : 'Direct'}</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-outline px-2 py-1" onClick={() => setEditing(r)}><Icon name="edit" /></button>
                  <button className="btn btn-danger px-2 py-1" onClick={() => handleDelete(r)}><Icon name="trash" /></button>
                </div>
              </div>
              <div className="font-medium">{r.name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 break-all">{r.content}</div>
            </div>
          ))}
          {!dnsRecords.length && (
            <div className="text-center text-gray-500 py-10 card">{selectedZone ? '暂无记录' : '请选择域名后查看解析记录'}</div>
          )}
        </div>

        {isLoading && (
          <div className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur px-4 py-2 shadow-soft">
            <span className="inline-block w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            <span className="text-sm">加载中...</span>
          </div>
        )}

        {editing !== null && (
          <RecordForm
            initial={editing?.id ? editing : null}
            onCancel={() => setEditing(null)}
            onSubmit={handleUpsert}
          />
        )}

        <footer className="mt-10 text-xs text-gray-500">
          {selectedZone && <span>当前域名：{selectedZone.name}</span>}
        </footer>
      </main>
    </div>
  )
}

