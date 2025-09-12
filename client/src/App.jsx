import { useEffect, useMemo, useRef, useState } from 'react'
import RecordFormModal from './components/RecordForm.jsx'
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
// 璇锋眰鎷︽埅锛氳嚜鍔ㄩ檮鍔犵櫥褰曚护鐗?api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('cf2dns:auth')
    if (token) config.headers['x-auth-token'] = token
  } catch (_) {}
  return config
})
// 瀹㈡埛绔紦瀛?TTL锛堟绉掞級锛屽彲閫氳繃 VITE_CACHE_TTL_MS 瑕嗙洊
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

function LegacyRecordForm_UNUSED({ initial, onCancel, onSubmit }) {
  const [type, setType] = useState(initial?.type || 'A')
  const [name, setName] = useState(initial?.name || '')
  const [content, setContent] = useState(initial?.content || '')
  const [ttl, setTtl] = useState(initial?.ttl ?? 1) // 1 = auto
  const [proxied, setProxied] = useState(initial?.proxied ?? false)

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({ type, name, content, ttl: Number(ttl), proxied })
  }

  // Toast 閫氱煡灏佽
  function notify(type, message) {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  // 鍚嶇О杞崲锛氱浉瀵瑰悕 -> 缁濆鍚?  function toAbsoluteName(input) {
    const zoneName = selectedZone?.name || ''
    const v = String(input || '').trim()
    if (!v || v === '@') return zoneName
    if (!zoneName) return v
    if (v.endsWith('.' + zoneName) || v === zoneName) return v
    return `${v}.${zoneName}`
  }

  // 鏈湴鏇存柊鏌愭潯璁板綍骞跺啓鍥炵紦瀛橈紙涓濇粦锛?  function updateRecordLocal(recordId, patch) {
    setDnsRecords(prev => {
      const next = prev.map(r => (r.id === recordId ? { ...r, ...patch } : r))
      writeRecordsCache(selectedZoneId, next)
      return next
    })
  }

  // 琛屽唴淇濆瓨
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
      if (!data?.success) throw new Error('淇濆瓨澶辫触')
      updateRecordLocal(record.id, body)
      notify('success', '宸蹭繚瀛?)
      setInlineEdit(null)
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || '淇濆瓨澶辫触'
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

  // 鍏ㄥ眬鐩戝惉锛氭嫋鍔ㄧ粡杩囧摢涓€琛?  useEffect(() => {
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
    // 鍏堟湰鍦扮珛鍗冲垏鎹紝鎻愬崌涓濇粦浣撴劅
    updateRecordLocal(record.id, { proxied: next })
    try {
      await saveInline({ ...record, proxied: record.proxied }, 'proxied', next)
    } catch (_) {
      // saveInline 鍐呴儴宸插鐞嗛€氱煡
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="card w-full max-w-xl animate-scale-in">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <h3 className="text-lg font-semibold">{initial ? '淇敼瑙ｆ瀽璁板綍' : '娣诲姞瑙ｆ瀽璁板綍'}</h3>
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
              <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600" placeholder="@ 鎴栧瓙鍩熷悕"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Content</label>
              <input value={content} onChange={e => setContent(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600" placeholder="鐩爣鍊?(IP/鍩熷悕/鏂囨湰)"/>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">TTL</label>
              <input type="number" min={1} value={ttl} onChange={e => setTtl(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"/>
              <p className="text-xs text-gray-500 mt-1">1 琛ㄧず鑷姩</p>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input id="proxied" type="checkbox" className="rounded border-gray-300 dark:border-gray-600" checked={proxied} onChange={e => setProxied(e.target.checked)} />
              <label htmlFor="proxied">Proxied</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="btn btn-outline">鍙栨秷</button>
            <button type="submit" className="btn btn-primary">淇濆瓨</button>
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
  // 杩囨护涓庢帓搴?  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('name') // name | type | content | proxied
  const [sortDir, setSortDir] = useState('asc') // asc | desc
  // 鎵归噺閫夋嫨
  const [selectedIds, setSelectedIds] = useState([])
  // 閫氱煡锛圱oast锛?  const [toasts, setToasts] = useState([]) // { id, type: 'success'|'error'|'info', message }
  // 琛屽唴缂栬緫鐘舵€?  const [inlineEdit, setInlineEdit] = useState(null) // { id, field, draft }
  const [inlineSavingKey, setInlineSavingKey] = useState(null) // `${id}:${field}`
  // 鎷栨嫿澶氶€夌姸鎬?  const [isDragSelecting, setIsDragSelecting] = useState(false)
  const [dragAction, setDragAction] = useState('select') // 'select' | 'deselect'
  const dragVisitedRef = useRef(new Set())
  const longPressTimerRef = useRef(null)
  // 鐧诲綍鎬?  const [needLogin, setNeedLogin] = useState(false)
  const [loginPwd, setLoginPwd] = useState('')
  const [loginError, setLoginError] = useState('')
  // 鎵归噺缂栬緫寮圭獥
  const [batchEditOpen, setBatchEditOpen] = useState(false)
  const [batchTTL, setBatchTTL] = useState('') // 涓虹┖琛ㄧず涓嶄慨鏀?  const [batchProxied, setBatchProxied] = useState('keep') // keep | true | false

  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId])

  // Toast 閫氱煡灏佽锛圓pp 绾э級
  function notify(type, message) {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  // 鍚嶇О杞崲锛氱浉瀵瑰悕 -> 缁濆鍚?  function toAbsoluteName(input) {
    const zoneName = selectedZone?.name || ''
    const v = String(input || '').trim()
    if (!v || v === '@') return zoneName
    if (!zoneName) return v
    if (v.endsWith('.' + zoneName) || v === zoneName) return v
    return `${v}.${zoneName}`
  }

  // 鏈湴鏇存柊璁板綍骞跺啓鍏ョ紦瀛?  function updateRecordLocal(recordId, patch) {
    setDnsRecords(prev => {
      const next = prev.map(r => (r.id === recordId ? { ...r, ...patch } : r))
      writeRecordsCache(selectedZoneId, next)
      return next
    })
  }

  // 琛屽唴淇濆瓨
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
      if (!data?.success) throw new Error('淇濆瓨澶辫触')
      updateRecordLocal(record.id, body)
      notify('success', '宸蹭繚瀛?)
      setInlineEdit(null)
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || '淇濆瓨澶辫触'
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
    updateRecordLocal(record.id, { proxied: next })
    try {
      await saveInline({ ...record, proxied: record.proxied }, 'proxied', next)
    } catch (_) {}
  }

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
        if (e?.response?.status === 401) setNeedLogin(true)
        setError(e.message || '鍔犺浇鍩熷悕鍒楄〃澶辫触')
      } finally {
        setIsLoading(false)
      }
    }
    loadZones()
  }, [])

  // 鍏ㄥ眬 401 鍝嶅簲鎷︽埅锛氳Е鍙戠櫥褰?  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err?.response?.status === 401) setNeedLogin(true)
        return Promise.reject(err)
      }
    )
    return () => { api.interceptors.response.eject(id) }
  }, [])

  async function handleLogin(e) {
    e?.preventDefault?.()
    setLoginError('')
    try {
      const { data } = await api.post('/api/auth/login', { password: loginPwd })
      if (!data?.success) throw new Error('鐧诲綍澶辫触')
      if (data.token) {
        try { localStorage.setItem('cf2dns:auth', data.token) } catch (_) {}
      }
      setNeedLogin(false)
      setLoginPwd('')
      notify('success', '鐧诲綍鎴愬姛')
      // 鐧诲綍鍚庝富鍔ㄥ埛鏂板煙鍚嶅拰褰撳墠璁板綍
      try {
        const { data: z } = await api.get('/api/zones')
        if (z?.success) setZones(z.result || [])
      } catch (_) {}
      if (selectedZoneId) await fetchRecords(true)
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || '鐧诲綍澶辫触'
      setLoginError(msg)
      notify('error', msg)
    }
  }

  // 璇诲彇涓庡啓鍏ョ紦瀛?  function readRecordsCache(zoneId) {
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
        // 鍐欏洖鍐呭瓨锛屽噺灏戝弽搴忓垪鍖栨垚鏈?        m.set(zoneId, { ts: obj.ts, data: obj.data })
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

  // 缁熶竴鎷夊彇鍑芥暟锛氬彲鍚庡彴鍒锋柊锛堜笉闃诲 UI锛?  async function fetchRecords(background = false) {
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
      if (!background) setError(e.message || '鍔犺浇瑙ｆ瀽璁板綍澶辫触')
    } finally {
      if (!background) setIsLoading(false)
    }
  }

  // 褰撳煙鍚嶅垏鎹㈡椂锛氬厛璇荤紦瀛樷€滅寮€鈥濓紝鍐嶅悗鍙板埛鏂?  useEffect(() => {
    if (!selectedZoneId) { setDnsRecords([]); return }
    const cached = readRecordsCache(selectedZoneId)
    if (cached) {
      setDnsRecords(cached)
      fetchRecords(true) // 鍚庡彴鍒锋柊
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
    if (!window.confirm(`纭鍒犻櫎璁板綍锛?{record.type} ${record.name} -> ${record.content} ?`)) return
    setIsLoading(true)
    setError('')
    try {
      const { data } = await api.delete(`/api/zones/${selectedZoneId}/dns_records/${record.id}`)
      if (!data?.success) throw new Error('鍒犻櫎澶辫触')
      notify('success', '鍒犻櫎鎴愬姛')
      await refreshRecords(true)
    } catch (e) {
      const status = e?.response?.status
      const msg = status === 404 ? '鍒犻櫎澶辫触锛氳褰曚笉瀛樺湪鎴栧凡琚垹闄? : (e?.response?.data?.message || e.message || '鍒犻櫎澶辫触')
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
        if (!data?.success) throw new Error('淇敼澶辫触')
        notify('success', '淇敼鎴愬姛')
      } else {
        const { data } = await api.post(`/api/zones/${selectedZoneId}/dns_records`, form)
        if (!data?.success) throw new Error('娣诲姞澶辫触')
        notify('success', '娣诲姞鎴愬姛')
      }
      setEditing(null)
      await refreshRecords(true)
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || '淇濆瓨澶辫触'
      setError(msg)
      notify('error', msg)
    } finally {
      setIsLoading(false)
    }
  }

  // 杈呭姪锛氬皢瀹屾暣 name 杞崲涓虹浉瀵瑰綋鍓嶅煙鍚嶇殑灞曠ず鍊?  function displayName(r) {
    if (!r?.name) return ''
    const zoneName = selectedZone?.name
    if (!zoneName) return r.name
    if (r.name === zoneName) return '@'
    const suffix = '.' + zoneName
    if (r.name.endsWith(suffix)) return r.name.slice(0, -suffix.length)
    return r.name
  }

  // 杩囨护 + 鎺掑簭鍚庣殑鍙璁板綍
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

  // 閫夋嫨閫昏緫
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
      // 浠呭彇娑堝綋鍓嶅彲瑙佺殑锛屼繚鐣欏叾浣欓€夋嫨锛堜絾姝ゅ鏇寸洿瑙傦細鍏ㄩ儴娓呯┖锛?      setSelectedIds([])
    }
  }

  useEffect(() => {
    // 鍒囨崲鍩熷悕鏃舵竻绌洪€夋嫨涓庢煡璇?    setSelectedIds([])
    setQuery('')
  }, [selectedZoneId])

  const selectedRecords = useMemo(() => {
    const map = new Map(dnsRecords.map(r => [r.id, r]))
    return selectedIds.map(id => map.get(id)).filter(Boolean)
  }, [selectedIds, dnsRecords])

  async function handleBatchDelete() {
    if (!selectedZoneId || !selectedRecords.length) return
    if (!window.confirm(`纭鎵归噺鍒犻櫎 ${selectedRecords.length} 鏉¤褰曪紵`)) return
    setIsLoading(true)
    setError('')
    try {
      const tasks = selectedRecords.map(r => api.delete(`/api/zones/${selectedZoneId}/dns_records/${r.id}`))
      const results = await Promise.allSettled(tasks)
      const ok = results.filter(r => r.status === 'fulfilled').length
      const fail = results.length - ok
      notify(fail ? 'error' : 'success', `鎵归噺淇敼瀹屾垚锛氭垚鍔?${ok}锛屽け璐?${fail}`)
      if (fail) {
        setError(`閮ㄥ垎鍒犻櫎澶辫触锛氭垚鍔?${ok} 鏉★紝澶辫触 ${fail} 鏉)
      }
      setSelectedIds([])
      await refreshRecords(true)
    } catch (e) {
      setError(e.message || '鎵归噺鍒犻櫎澶辫触')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleBatchEditSubmit(e) {
    e?.preventDefault?.()
    if (!selectedZoneId || !selectedRecords.length) return
    // 瑙ｆ瀽鎵归噺鍙傛暟
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
        setError(`閮ㄥ垎淇敼澶辫触锛氭垚鍔?${ok} 鏉★紝澶辫触 ${fail} 鏉)
      }
      setBatchEditOpen(false)
      setBatchTTL('')
      setBatchProxied('keep')
      await refreshRecords(true)
    } catch (e) {
      setError(e.message || '鎵归噺淇敼澶辫触')
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
            <h1 className="text-lg md:text-xl font-semibold">Cloudflare DNS 瑙ｆ瀽绠＄悊</h1>
          </div>
          <button
            className="btn btn-outline text-white border-white/40 hover:bg-white/10"
            onClick={() => {
              const next = !dark
              setDark(next)
              document.documentElement.classList.toggle('dark', next)
              localStorage.setItem('theme', next ? 'dark' : 'light')
            }}
            aria-label="鍒囨崲涓婚"
          >
            <Icon name={dark ? 'sun' : 'moon'} />
            <span className="hidden sm:inline">{dark ? '娴呰壊' : '娣辫壊'}</span>
          </button>
        </div>
      </header>

      <main className="container py-6 md:py-8">
        {/* 鐧诲綍閬僵 */}
        {needLogin && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-in">
            <div className="card w-full max-w-sm animate-scale-in p-5">
              <h3 className="text-lg font-semibold mb-3">鐧诲綍</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">璇疯緭鍏ョ幆澧冨彉閲忛厤缃殑鐧诲綍瀵嗙爜</p>
              {loginError && (
                <div className="mb-3 px-3 py-2 rounded border bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900/50 text-sm">{loginError}</div>
              )}
              <form onSubmit={handleLogin} className="space-y-3">
                <input type="password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} placeholder="鐧诲綍瀵嗙爜" className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"/>
                <div className="flex justify-end gap-2">
                  <button type="submit" className="btn btn-primary">鐧诲綍</button>
                </div>
              </form>
            </div>
          </div>
        )}
        <div className="card p-4 md:p-6 mb-6 animate-slide-up">
          <label className="block text-sm font-medium mb-2">閫夋嫨鍩熷悕</label>
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <select
              value={selectedZoneId}
              onChange={e => setSelectedZoneId(e.target.value)}
              className="w-full md:w-1/2 border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            >
              <option value="">璇烽€夋嫨涓€涓煙鍚?/option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
            <button
              onClick={() => setEditing({})}
              disabled={!selectedZoneId}
              className="btn btn-primary disabled:opacity-50"
            >
              <Icon name="plus" /> 娣诲姞鏂拌褰?            </button>
          </div>
        </div>

        {/* 绛涢€?/ 鎺掑簭 / 鎵归噺鎿嶄綔 */}
        <div className="card p-4 md:p-6 mb-6 animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-1">鎼滅储</label>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="鎸?Name/Type/Content/Proxied 鎼滅储"
                className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              />
            </div>
            <div className="flex gap-2 md:col-span-2 md:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">鎺掑簭瀛楁</label>
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
                    <option value="asc">鍗囧簭</option>
                    <option value="desc">闄嶅簭</option>
                  </select>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <button
                  className="btn btn-outline"
                  disabled={!selectedZoneId || !selectedRecords.length}
                  onClick={handleBatchDelete}
                >鎵归噺鍒犻櫎</button>
                <button
                  className="btn btn-outline"
                  disabled={!selectedZoneId || !selectedRecords.length}
                  onClick={() => setBatchEditOpen(true)}
                >鎵归噺淇敼</button>
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
                    aria-label="鍏ㄩ€?
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
                      aria-label="閫夋嫨璁板綍"
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
                      <Icon name="edit" /> 淇敼
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(r)}>
                      <Icon name="trash" /> 鍒犻櫎
                    </button>
                  </td>
                </tr>
              ))}
              {!visibleRecords.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">{selectedZone ? '鏆傛棤璁板綍' : '璇烽€夋嫨鍩熷悕鍚庢煡鐪嬭В鏋愯褰?}</td>
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
                      aria-label="閫夋嫨璁板綍"
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
            <div className="text-center text-gray-500 py-10 card">{selectedZone ? '鏆傛棤璁板綍' : '璇烽€夋嫨鍩熷悕鍚庢煡鐪嬭В鏋愯褰?}</div>
          )}
        </div>

        {isLoading && (
          <div className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur px-4 py-2 shadow-soft">
            <span className="inline-block w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            <span className="text-sm">鍔犺浇涓?..</span>
          </div>
        )}

        {editing !== null && (
          <RecordFormModal
            initial={editing?.id ? editing : null}
            onCancel={() => setEditing(null)}
            onSubmit={handleUpsert}
          />
        )}

        {/* Toast 閫氱煡瀹瑰櫒 */}
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

        {/* 鎵归噺淇敼寮圭獥 */}
        {batchEditOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="card w-full max-w-md animate-scale-in">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10">
                <h3 className="text-lg font-semibold">鎵归噺淇敼锛坽selectedRecords.length} 鏉★級</h3>
              </div>
              <form onSubmit={handleBatchEditSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">TTL</label>
                  <input
                    value={batchTTL}
                    onChange={e => setBatchTTL(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    placeholder="鐣欑┖淇濇寔涓嶅彉锛? 琛ㄧず鑷姩"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Proxied</label>
                  <select
                    value={batchProxied}
                    onChange={e => setBatchProxied(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  >
                    <option value="keep">淇濇寔涓嶅彉</option>
                    <option value="true">寮€鍚?/option>
                    <option value="false">鍏抽棴</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setBatchEditOpen(false)} className="btn btn-outline">鍙栨秷</button>
                  <button type="submit" className="btn btn-primary">搴旂敤</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <footer className="mt-10 text-xs text-gray-500">
          {selectedZone && <span>褰撳墠鍩熷悕锛歿selectedZone.name}</span>}
        </footer>
      </main>
    </div>
  )
}


