import { useEffect, useState } from 'react'

export default function RecordForm({ initial, onCancel, onSubmit }) {
  // 使用 initial 作为默认值，并在变更时同步
  const [type, setType] = useState(initial?.type || 'A')
  const [name, setName] = useState(initial?.name || '')
  const [content, setContent] = useState(initial?.content || '')
  const [ttl, setTtl] = useState(initial?.ttl ?? 1) // 1 = auto
  const [proxied, setProxied] = useState(initial?.proxied ?? false)

  useEffect(() => {
    setType(initial?.type || 'A')
    setName(initial?.name || '')
    setContent(initial?.content || '')
    setTtl(initial?.ttl ?? 1)
    setProxied(initial?.proxied ?? false)
  }, [initial?.id])

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
              <input value={content} onChange={e => setContent(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600" placeholder="目标（IP/域名/文本）"/>
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

