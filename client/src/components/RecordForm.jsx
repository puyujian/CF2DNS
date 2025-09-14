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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="card w-full max-w-2xl animate-scale-in shadow-2xl border-2 border-gray-200 dark:border-gray-600">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
          <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {initial ? '修改解析记录' : '添加解析记录'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="group">
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">记录类型</label>
              <select value={type} onChange={e => setType(e.target.value)} className="select pulse-ring">
                {['A','AAAA','CNAME','TXT','MX','NS','SRV','PTR','CAA'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="group">
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">记录名称</label>
              <input value={name} onChange={e => setName(e.target.value)} className="input pulse-ring" placeholder="@ 或子域名（无需包含域名）"/>
              <p className="text-xs text-gray-500 mt-2 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">示例：@、www、api；无需写成 www.你的域名.com</p>
            </div>
            <div className="md:col-span-2 group">
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">记录内容</label>
              <input value={content} onChange={e => setContent(e.target.value)} className="input pulse-ring" placeholder="目标（IP/域名/文本）"/>
            </div>
            <div className="group">
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">TTL（秒）</label>
              <input type="number" min={1} value={ttl} onChange={e => setTtl(e.target.value)} className="input pulse-ring"/>
              <p className="text-xs text-gray-500 mt-2 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">1 表示自动</p>
            </div>
            <div className="flex items-center gap-3 mt-6 group">
              <input id="proxied" type="checkbox" className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 transition-all" checked={proxied} onChange={e => setProxied(e.target.checked)} />
              <label htmlFor="proxied" className="font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">启用 Cloudflare 代理</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onCancel} className="btn btn-outline">取消</button>
            <button type="submit" className="btn btn-primary pulse-ring">
              {initial ? '保存修改' : '添加记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
