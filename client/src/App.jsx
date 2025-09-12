import { useEffect, useMemo, useRef, useState } from 'react'
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
// 客户端缓存 TTL（毫秒），可通过 VITE_CACHE_TTL_MS 覆盖
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

  // Toast 通知封装
  function notify(type, message) {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  // 名称转换：相对名 -> 绝对名
  function toAbsoluteName(input) {
    const zoneName = selectedZone?.name || ''
    const v = String(input || '').trim()
    if (!v || v === '@') return zoneName
    if (!zoneName) return v
    if (v.endsWith('.' + zoneName) || v === zoneName) return v
    return `${v}.${zoneName}`
  }

  // 本地更新某条记录并写回缓存（丝滑）
  function updateRecordLocal(recordId, patch) {
    setDnsRecords(prev => {
      const next = prev.map(r => (r.id === recordId ? { ...r, ...patch } : r))
      writeRecordsCache(selectedZoneId, next)
      return next
    })
  }

  // 行内保存
  async function saveInline(record, field, newValue) {
    if (!selectedZoneId || !record?.id) return
    const key = `${record.id}:${field}`
    setInlineSavingKey(key)
    const body = {
      type: field === 'type' ? newValue : record.type,
      name: field === 'name' ? toAbsoluteName(newValue) : record.name,
      content: field === 'content' ? newValue : record.content,
      ttl: record.ttl ?? 1,
      proxied: field === 'proxied' ? Boolean(newValue) : record.proxied,
    }
    try {
      const { data } = await api.put(`/api/zones/${selectedZoneId}/dns_records/${record.id}`, body)
      if (!data?.success) throw new Error('保存失败')
      updateRecordLocal(record.id, body)
      notify('success', '已保存')
      setInlineEdit(null)
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || '保存失败'
      notify('error', msg)
    } finally {
      setInlineSavingKey(null)
    }
  }

  function isInteractiveTarget(target) {
    const t = target.closest ? target.closest('button, input, select, a, label, textarea') : null
    return Boolean(t)
  }

  function beginSelectDrag(startId, startChecked) {
    setIsDragSelecting(true)
    setDragAction(startChecked ? 'deselect' : 'select')
    dragVisitedRef.current = new Set()
    applySelectDrag(startId)
  }

  function applySelectDrag(id) {
    const visited = dragVisitedRef.current
    if (!isDragSelecting || visited.has(id)) return
    visited.add(id)
    setSelectedIds(prev => {
      const set = new Set(prev)
      if (dragAction === 'select') set.add(id); else set.delete(id)
      return Array.from(set)
    })
  }

  function endSelectDrag() {
    setIsDragSelecting(false)
    dragVisitedRef.current.clear()
  }

  // 全局监听：拖动经过哪一行
  useEffect(() => {
    function onPointerMove(e) {
      if (!isDragSelecting) return
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el) return
      const row = el.closest('[data-record-id]')
      if (!row) return
      const id = row.getAttribute('data-record-id')
      if (id) applySelectDrag(id)
    }
    function onPointerUp() { if (isDragSelecting) endSelectDrag() }
    if (isDragSelecting) {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('pointerup', onPointerUp, { passive: true })
      window.addEventListener('pointercancel', onPointerUp, { passive: true })
    }
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [isDragSelecting])

  function handleRowPointerDown(e, record) {
    if (isInteractiveTarget(e.target)) return
    const start = () => beginSelectDrag(record.id, selectedIds.includes(record.id))
    if (e.pointerType === 'touch') {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = setTimeout(start, 250)
    } else if (e.button === 0) {
      start()
    }
  }

  function handlePointerUpGlobal() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }
  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUpGlobal, { passive: true })
    window.addEventListener('pointercancel', handlePointerUpGlobal, { passive: true })
    return () => {
      window.removeEventListener('pointerup', handlePointerUpGlobal)
      window.removeEventListener('pointercancel', handlePointerUpGlobal)
    }
  }, [])

  async function toggleProxied(record) {
    const next = !record.proxied
    // 先本地立即切换，提升丝滑体感
    updateRecordLocal(record.id, { proxied: next })
    try {
      await saveInline({ ...record, proxied: record.proxied }, 'proxied', next)
    } catch (_) {
      // saveInline 内部已处理通知
    }
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
  const recordsCacheRef = useRef(new Map()) // zoneId -> { ts, data }
  // 过滤与排序
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('name') // name | type | content | proxied
  const [sortDir, setSortDir] = useState('asc') // asc | desc
  // 批量选择
  const [selectedIds, setSelectedIds] = useState([])
  // 通知（Toast）
  const [toasts, setToasts] = useState([]) // { id, type: 'success'|'error'|'info', message }
  // 行内编辑状态
  const [inlineEdit, setInlineEdit] = useState(null) // { id, field, draft }
  const [inlineSavingKey, setInlineSavingKey] = useState(null) // `${id}:${field}`
  // 拖拽多选状态
  const [isDragSelecting, setIsDragSelecting] = useState(false)
  const [dragAction, setDragAction] = useState('select') // 'select' | 'deselect'
  const dragVisitedRef = useRef(new Set())
  const longPressTimerRef = useRef(null)
  // 批量编辑弹窗
  const [batchEditOpen, setBatchEditOpen] = useState(false)
  const [batchTTL, setBatchTTL] = useState('') // 为空表示不修改
  const [batchProxied, setBatchProxied] = useState('keep') // keep | true | false

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

  // 读取与写入缓存
  function readRecordsCache(zoneId) {
    if (!zoneId) return null
    const now = Date.now()
    const m = recordsCacheRef.current
    const mem = m.get(zoneId)
    if (mem && now - mem.ts <= RECORDS_CACHE_TTL) return mem.data
    try {
      const raw = localStorage.getItem(`cf2dns:records:${zoneId}`)
      if (!raw) return null
      const obj = JSON.parse(raw)
      if (obj && obj.ts && Array.isArray(obj.data) && now - obj.ts <= RECORDS_CACHE_TTL) {
        // 写回内存，减少反序列化成本
        m.set(zoneId, { ts: obj.ts, data: obj.data })
        return obj.data
      }
    } catch (_) {}
    return null
  }
  function writeRecordsCache(zoneId, data) {
    if (!zoneId) return
    const obj = { ts: Date.now(), data }
    recordsCacheRef.current.set(zoneId, obj)
    try { localStorage.setItem(`cf2dns:records:${zoneId}`, JSON.stringify(obj)) } catch (_) {}
  }

  // 统一拉取函数：可后台刷新（不阻塞 UI）
  async function fetchRecords(background = false) {
    if (!selectedZoneId) return
    if (!background) { setIsLoading(true); setError('') }
    try {
      const { data } = await api.get(`/api/zones/${selectedZoneId}/dns_records`)
      if (data?.success) {
        const list = data.result || []
        setDnsRecords(list)
        writeRecordsCache(selectedZoneId, list)
      } else {
        throw new Error(JSON.stringify(data))
      }
    } catch (e) {
      if (!background) setError(e.message || '加载解析记录失败')
    } finally {
      if (!background) setIsLoading(false)
    }
  }

  // 当域名切换时：先读缓存“秒开”，再后台刷新
  useEffect(() => {
    if (!selectedZoneId) { setDnsRecords([]); return }
    const cached = readRecordsCache(selectedZoneId)
    if (cached) {
      setDnsRecords(cached)
      fetchRecords(true) // 后台刷新
    } else {
      fetchRecords(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZoneId])

  const [editing, setEditing] = useState(null) // null | record object | 'create'

  async function refreshRecords(background = false) {
    await fetchRecords(background)
  }

  async function handleDelete(record) {
    if (!selectedZoneId) return
    if (!window.confirm(`确认删除记录：${record.type} ${record.name} -> ${record.content} ?`)) return
    setIsLoading(true)
    setError('')
    try {
      const { data } = await api.delete(`/api/zones/${selectedZoneId}/dns_records/${record.id}`)
      if (!data?.success) throw new Error('删除失败')
      notify('success', '删除成功')
      await refreshRecords(true)
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || '删除失败'
      setError(msg)
      notify('error', msg)
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
        notify('success', '修改成功')
      } else {
        const { data } = await api.post(`/api/zones/${selectedZoneId}/dns_records`, form)
        if (!data?.success) throw new Error('添加失败')
        notify('success', '添加成功')
      }
      setEditing(null)
      await refreshRecords(true)
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || '保存失败'
      setError(msg)
      notify('error', msg)
    } finally {
      setIsLoading(false)
    }
  }

  // 辅助：将完整 name 转换为相对当前域名的展示值
  function displayName(r) {
    if (!r?.name) return ''
    const zoneName = selectedZone?.name
    if (!zoneName) return r.name
    if (r.name === zoneName) return '@'
    const suffix = '.' + zoneName
    if (r.name.endsWith(suffix)) return r.name.slice(0, -suffix.length)
    return r.name
  }

  // 过滤 + 排序后的可见记录
  const visibleRecords = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = dnsRecords.filter(r => {
      if (!q) return true
      const dn = displayName(r).toLowerCase()
      const t = (r.type || '').toLowerCase()
      const c = (r.content || '').toLowerCase()
      const p = r.proxied ? 'proxied' : 'direct'
      return dn.includes(q) || t.includes(q) || c.includes(q) || p.includes(q)
    })
    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const va = sortKey === 'name' ? displayName(a) : (sortKey === 'type' ? a.type : (sortKey === 'content' ? a.content : (a.proxied ? 1 : 0)))
      const vb = sortKey === 'name' ? displayName(b) : (sortKey === 'type' ? b.type : (sortKey === 'content' ? b.content : (b.proxied ? 1 : 0)))
      if (va == null && vb == null) return 0
      if (va == null) return -1 * dir
      if (vb == null) return 1 * dir
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
    return list
  }, [dnsRecords, query, sortKey, sortDir, selectedZone])

  // 选择逻辑
  const allVisibleSelected = useMemo(() => {
    if (!visibleRecords.length) return false
    const set = new Set(selectedIds)
    return visibleRecords.every(r => set.has(r.id))
  }, [visibleRecords, selectedIds])

  function toggleSelect(id, checked) {
    setSelectedIds(prev => {
      const set = new Set(prev)
      if (checked) set.add(id); else set.delete(id)
      return Array.from(set)
    })
  }

  function toggleSelectAll(checked) {
    if (checked) {
      setSelectedIds(visibleRecords.map(r => r.id))
    } else {
      // 仅取消当前可见的，保留其余选择（但此处更直观：全部清空）
      setSelectedIds([])
    }
  }

  useEffect(() => {
    // 切换域名时清空选择与查询
    setSelectedIds([])
    setQuery('')
  }, [selectedZoneId])

  const selectedRecords = useMemo(() => {
    const map = new Map(dnsRecords.map(r => [r.id, r]))
    return selectedIds.map(id => map.get(id)).filter(Boolean)
  }, [selectedIds, dnsRecords])

  async function handleBatchDelete() {
    if (!selectedZoneId || !selectedRecords.length) return
    if (!window.confirm(`确认批量删除 ${selectedRecords.length} 条记录？`)) return
    setIsLoading(true)
    setError('')
    try {
      const tasks = selectedRecords.map(r => api.delete(`/api/zones/${selectedZoneId}/dns_records/${r.id}`))
      const results = await Promise.allSettled(tasks)
      const ok = results.filter(r => r.status === 'fulfilled').length
      const fail = results.length - ok
      notify(fail ? 'error' : 'success', `批量修改完成：成功 ${ok}，失败 ${fail}`)
      if (fail) {
        setError(`部分删除失败：成功 ${ok} 条，失败 ${fail} 条`)
      }
      setSelectedIds([])
      await refreshRecords(true)
    } catch (e) {
      setError(e.message || '批量删除失败')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleBatchEditSubmit(e) {
    e?.preventDefault?.()
    if (!selectedZoneId || !selectedRecords.length) return
    // 解析批量参数
    const ttlRaw = String(batchTTL).trim()
    const ttlParsed = ttlRaw ? Number(ttlRaw) : null
    const proxiedVal = batchProxied === 'keep' ? null : (batchProxied === 'true')
    setIsLoading(true)
    setError('')
    try {
      const tasks = selectedRecords.map(r => {
        const body = {
          type: r.type,
          name: r.name,
          content: r.content,
          ttl: ttlParsed !== null ? ttlParsed : (r.ttl ?? 1),
          proxied: proxiedVal !== null ? proxiedVal : r.proxied,
        }
        return api.put(`/api/zones/${selectedZoneId}/dns_records/${r.id}`, body)
      })
      const results = await Promise.allSettled(tasks)
      const ok = results.filter(r => r.status === 'fulfilled').length
      const fail = results.length - ok
      if (fail) {
        setError(`部分修改失败：成功 ${ok} 条，失败 ${fail} 条`)
      }
      setBatchEditOpen(false)
      setBatchTTL('')
      setBatchProxied('keep')
      await refreshRecords(true)
    } catch (e) {
      setError(e.message || '批量修改失败')
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

        {/* 筛选 / 排序 / 批量操作 */}
        <div className="card p-4 md:p-6 mb-6 animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-1">搜索</label>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="按 Name/Type/Content/Proxied 搜索"
                className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              />
            </div>
            <div className="flex gap-2 md:col-span-2 md:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">排序字段</label>
                <div className="flex gap-2">
                  <select
                    value={sortKey}
                    onChange={e => setSortKey(e.target.value)}
                    className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  >
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                    <option value="content">Content</option>
                    <option value="proxied">Proxied</option>
                  </select>
                  <select
                    value={sortDir}
                    onChange={e => setSortDir(e.target.value)}
                    className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  >
                    <option value="asc">升序</option>
                    <option value="desc">降序</option>
                  </select>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <button
                  className="btn btn-outline"
                  disabled={!selectedZoneId || !selectedRecords.length}
                  onClick={handleBatchDelete}
                >批量删除</button>
                <button
                  className="btn btn-outline"
                  disabled={!selectedZoneId || !selectedRecords.length}
                  onClick={() => setBatchEditOpen(true)}
                >批量修改</button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900/50">
            {String(error)}
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto card animate-slide-up select-none">
          <table className="table min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th>
                  <input
                    aria-label="全选"
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600"
                    checked={allVisibleSelected}
                    onChange={e => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Type</th>
                <th>Name</th>
                <th>Content</th>
                <th>Proxied</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map(r => (
                <tr key={r.id} data-record-id={r.id} onPointerDown={e => handleRowPointerDown(e, r)} className="touch-none">
                  <td>
                    <input
                      aria-label="选择记录"
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600"
                      checked={selectedIds.includes(r.id)}
                      onChange={e => toggleSelect(r.id, e.target.checked)}
                    />
                  </td>
                  <td onDoubleClick={() => setInlineEdit({ id: r.id, field: 'type', draft: r.type })} className="cursor-pointer">
                    {inlineEdit?.id === r.id && inlineEdit?.field === 'type' ? (
                      <select
                        autoFocus
                        value={inlineEdit.draft}
                        onChange={e => {
                          const v = e.target.value
                          setInlineEdit(prev => ({ ...prev, draft: v }))
                          saveInline(r, 'type', v)
                        }}
                        onBlur={() => { if (inlineEdit) saveInline(r, 'type', inlineEdit.draft) }}
                        className="border rounded px-2 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      >
                        {['A','AAAA','CNAME','TXT','MX','NS','SRV','PTR','CAA'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <span className="chip">{r.type}</span>
                    )}
                  </td>
                  <td onDoubleClick={() => setInlineEdit({ id: r.id, field: 'name', draft: displayName(r) })} className="font-medium cursor-text hover:bg-gray-50/70 dark:hover:bg-white/5 rounded">
                    {inlineEdit?.id === r.id && inlineEdit?.field === 'name' ? (
                      <input
                        autoFocus
                        value={inlineEdit.draft}
                        onChange={e => setInlineEdit(prev => ({ ...prev, draft: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveInline(r, 'name', inlineEdit.draft)
                          if (e.key === 'Escape') setInlineEdit(null)
                        }}
                        onBlur={() => saveInline(r, 'name', inlineEdit.draft)}
                        className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      />
                    ) : (
                      <span>{displayName(r)}</span>
                    )}
                  </td>
                  <td onDoubleClick={() => setInlineEdit({ id: r.id, field: 'content', draft: r.content })} className="text-gray-700 dark:text-gray-300 cursor-text hover:bg-gray-50/70 dark:hover:bg-white/5 rounded">
                    {inlineEdit?.id === r.id && inlineEdit?.field === 'content' ? (
                      <input
                        autoFocus
                        value={inlineEdit.draft}
                        onChange={e => setInlineEdit(prev => ({ ...prev, draft: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveInline(r, 'content', inlineEdit.draft)
                          if (e.key === 'Escape') setInlineEdit(null)
                        }}
                        onBlur={() => saveInline(r, 'content', inlineEdit.draft)}
                        className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      />
                    ) : (
                      <div className="max-w-[420px] truncate" title={r.content}>{r.content}</div>
                    )}
                  </td>
                  <td>
                    <button
                      disabled={inlineSavingKey === `${r.id}:proxied`}
                      onClick={() => toggleProxied(r)}
                      className={`chip transition-colors duration-150 ${r.proxied ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-200'}`}
                    >
                      {inlineSavingKey === `${r.id}:proxied` ? '...' : (r.proxied ? 'Yes' : 'No')}
                    </button>
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
              {!visibleRecords.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">{selectedZone ? '暂无记录' : '请选择域名后查看解析记录'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="md:hidden grid gap-3 animate-slide-up select-none">
          {visibleRecords.map(r => (
            <div key={r.id} data-record-id={r.id} className="card p-4 touch-none" onPointerDown={e => handleRowPointerDown(e, r)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="chip">{r.type}</span>
                  <button onClick={() => toggleProxied(r)} className={`text-xs px-2 py-0.5 rounded-full border ${r.proxied ? 'border-emerald-300 text-emerald-700 dark:text-emerald-200' : 'border-gray-300 text-gray-600 dark:text-gray-300'}`}>
                    {r.proxied ? 'Proxied' : 'Direct'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      aria-label="选择记录"
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600"
                      checked={selectedIds.includes(r.id)}
                      onChange={e => toggleSelect(r.id, e.target.checked)}
                    />
                  </label>
                  <button className="btn btn-outline px-2 py-1" onClick={() => setEditing(r)}><Icon name="edit" /></button>
                  <button className="btn btn-danger px-2 py-1" onClick={() => handleDelete(r)}><Icon name="trash" /></button>
                </div>
              </div>
              <div className="font-medium">{displayName(r)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 break-all line-clamp-2" title={r.content}>{r.content}</div>
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

        {editing !== null && (
          <RecordForm
            initial={editing?.id ? editing : null}
            onCancel={() => setEditing(null)}
            onSubmit={handleUpsert}
          />
        )}

        {/* Toast 通知容器 */}
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

        {/* 批量修改弹窗 */}
        {batchEditOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="card w-full max-w-md animate-scale-in">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10">
                <h3 className="text-lg font-semibold">批量修改（{selectedRecords.length} 条）</h3>
              </div>
              <form onSubmit={handleBatchEditSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">TTL</label>
                  <input
                    value={batchTTL}
                    onChange={e => setBatchTTL(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    placeholder="留空保持不变，1 表示自动"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Proxied</label>
                  <select
                    value={batchProxied}
                    onChange={e => setBatchProxied(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  >
                    <option value="keep">保持不变</option>
                    <option value="true">开启</option>
                    <option value="false">关闭</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setBatchEditOpen(false)} className="btn btn-outline">取消</button>
                  <button type="submit" className="btn btn-primary">应用</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <footer className="mt-10 text-xs text-gray-500">
          {selectedZone && <span>当前域名：{selectedZone.name}</span>}
        </footer>
      </main>
    </div>
  )
}
