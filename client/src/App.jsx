import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

// 计算 API 基地址：开发用 3000，生产同源，可用 VITE_API_BASE 覆盖
const loc = typeof window !== 'undefined' ? window.location : undefined
const defaultBase = (loc && loc.port === '5173')
  ? 'http://localhost:3000'
  : (loc?.origin || 'http://localhost:3000')
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || defaultBase,
  timeout: 15000,
})

// 请求拦截：自动附加登录令牌
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('cf2dns:auth')
    if (token) config.headers['x-auth-token'] = token
  } catch (_) {}
  return config
})

// 客户端缓存 TTL（毫秒）
const RECORDS_CACHE_TTL = Number(import.meta.env.VITE_CACHE_TTL_MS || 60000)

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

export default function App() {
  // 主题与提示
  const [dark, setDark] = useState(false)
  const [toasts, setToasts] = useState([]) // { id, type, message }

  // 数据
  const [zones, setZones] = useState([])
  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId])

  function notify(type, message) {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  async function fetchZones() {
    setIsLoading(true)
    setError('')
    try {
      const { data } = await api.get('/api/zones')
      if (data?.success) {
        setZones(data.result || [])
      } else {
        throw new Error(data?.message || '加载域名失败')
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '加载域名失败')
      notify('error', '加载域名失败')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchRecords(zoneId) {
    if (!zoneId) return
    setIsLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/api/zones/${zoneId}/dns_records`)
      if (data?.success) {
        setRecords(data.result || [])
      } else {
        throw new Error(data?.message || '加载解析记录失败')
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '加载解析记录失败')
      notify('error', '加载解析记录失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchZones()
  }, [])

  function handleSelectZone(e) {
    const id = e.target.value
    setSelectedZoneId(id)
    setRecords([])
    if (id) fetchRecords(id)
  }

  const visibleRecords = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return records
    return records.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.type || '').toLowerCase().includes(q) ||
      (r.content || '').toLowerCase().includes(q)
    )
  }, [records, query])

  function displayName(r) {
    if (!r?.name) return ''
    const zoneName = selectedZone?.name
    if (!zoneName) return r.name
    if (r.name === zoneName) return '@'
    const suffix = '.' + zoneName
    if (r.name.endsWith(suffix)) return r.name.slice(0, -suffix.length)
    return r.name
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
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="card">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <select value={selectedZoneId} onChange={handleSelectZone} className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
              <option value="">选择域名</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索记录（name/type/content）" className="border rounded-lg px-3 py-2 flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"/>
            <button className="btn btn-outline" onClick={fetchZones}>刷新域名</button>
            {selectedZoneId && <button className="btn btn-primary" onClick={() => fetchRecords(selectedZoneId)}>刷新记录</button>}
          </div>
        </div>

        {!!error && (
          <div className="card text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-200 border border-rose-200 dark:border-rose-800/50">
            {error}
          </div>
        )}

        <div className="grid gap-3">
          {visibleRecords.map(r => (
            <div key={r.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-semibold">{r.type || '?'}</span>
                <div className="min-w-0">
                  <div className="font-medium truncate">{displayName(r)}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 break-all" title={r.content}>{r.content}</div>
                </div>
              </div>
              <div className="text-xs px-2 py-0.5 rounded-full border select-none ${r.proxied ? 'border-emerald-300 text-emerald-700 dark:text-emerald-200' : 'border-gray-300 text-gray-600 dark:text-gray-300'}">
                {r.proxied ? 'Proxied' : 'Direct'}
              </div>
            </div>
          ))}
          {!visibleRecords.length && (
            <div className="text-center text-gray-500 py-10 card">{selectedZone ? '暂无记录' : '请选择域名后查看解析记录'}</div>
          )}
        </div>

        {isLoading && (
          <div className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur px-4 py-2 shadow-soft">
            <span className="inline-block w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            <span className="text-sm">加载中...</span>
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
      </main>
    </div>
  )
}

// 简单的卡片和按钮样式（Tailwind 组合类）
// 放在这里仅为演示，生产建议抽出到 CSS 文件
// eslint-disable-next-line no-unused-vars
const styles = `
.card { @apply bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl p-4 shadow-soft; }
.btn { @apply inline-flex items-center gap-2 rounded-lg px-3 py-2; }
.btn-primary { @apply bg-indigo-600 text-white hover:bg-indigo-700; }
.btn-outline { @apply border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50; }
`
