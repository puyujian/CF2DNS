import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, err: null }
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, err }
  }
  componentDidCatch(err, info) {
    // 在控制台打印，便于定位（生产可接入上报）
    // eslint-disable-next-line no-console
    console.error('UI ErrorBoundary:', err, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <h3>界面加载出错</h3>
          <p style={{ color: '#666' }}>请返回上一步或刷新页面重试。</p>
        </div>
      )
    }
    return this.props.children
  }
}

