import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'

export function TestPage() {
  const [count, setCount] = useState(0)

  const handleClick = () => {
    console.log('Button clicked!')
    alert('按钮点击成功!')
    setCount(prev => prev + 1)
  }

  const handleNativeClick = () => {
    console.log('Native button clicked!')
    alert('原生按钮点击成功!')
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">测试页面</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">原生按钮测试</h2>
          <button 
            onClick={handleNativeClick}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            原生按钮 (点击测试)
          </button>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">组件按钮测试</h2>
          <Button onClick={handleClick} variant="primary">
            组件按钮 (点击测试)
          </Button>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">状态测试</h2>
          <p>点击次数: {count}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">多个按钮测试</h2>
          <div className="space-x-2">
            <Button onClick={handleClick} variant="primary">主要按钮</Button>
            <Button onClick={handleClick} variant="secondary">次要按钮</Button>
            <Button onClick={handleClick} variant="outline">轮廓按钮</Button>
            <Button onClick={handleClick} variant="danger">危险按钮</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
