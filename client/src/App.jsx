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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-xl">
        <div className="px-5 py-4 border-b">
          <h3 className="text-lg font-semibold">{initial ? '修改解析记录' : '添加解析记录'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full border rounded px-3 py-2">
                {['A','AAAA','CNAME','TXT','MX','NS','SRV','PTR','CAA'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="@ 或子域名"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Content</label>
              <input value={content} onChange={e => setContent(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="目标值 (IP/域名/文本)"/>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">TTL</label>
              <input type="number" min={1} value={ttl} onChange={e => setTtl(e.target.value)} className="w-full border rounded px-3 py-2"/>
              <p className="text-xs text-gray-500 mt-1">1 表示自动</p>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input id="proxied" type="checkbox" checked={proxied} onChange={e => setProxied(e.target.checked)} />
              <label htmlFor="proxied">Proxied</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">取消</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">保存</button>
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

  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId), [zones, selectedZoneId])

  // Load zones on mount
  useEffect(() => {
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
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Cloudflare DNS 解析管理</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="block text-sm font-medium mb-2">选择域名</label>
        <select
          value={selectedZoneId}
          onChange={e => setSelectedZoneId(e.target.value)}
          className="w-full md:w-1/2 border rounded px-3 py-2"
        >
          <option value="">请选择一个域名</option>
          {zones.map(z => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">解析记录</h2>
        <button
          onClick={() => setEditing({})}
          disabled={!selectedZoneId}
          className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >添加新记录</button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 border border-red-200">{String(error)}</div>
      )}

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-4 py-2">Type</th>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Content</th>
              <th className="text-left px-4 py-2">Proxied</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dnsRecords.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.type}</td>
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.content}</td>
                <td className="px-4 py-2">{r.proxied ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 space-x-2">
                  <button className="px-2 py-1 border rounded" onClick={() => setEditing(r)}>修改</button>
                  <button className="px-2 py-1 border rounded text-red-600" onClick={() => handleDelete(r)}>删除</button>
                </td>
              </tr>
            ))}
            {!dnsRecords.length && (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={5}>{selectedZone ? '暂无记录' : '请选择域名后查看解析记录'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isLoading && (
        <p className="mt-4 text-sm text-gray-500">加载中...</p>
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
    </div>
  )}
