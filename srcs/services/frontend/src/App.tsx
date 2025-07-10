import { useState } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const testApi = async () => {
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/ping`)
      const data = await response.json()
      setMessage(`API Response: ${JSON.stringify(data)}`)
    } catch (error) {
      setMessage(`API Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="App">
      <h1>Trascendence Frontend</h1>
      <button onClick={testApi} disabled={loading}>
        {loading ? 'Testing...' : 'API Test'}
      </button>
      {message && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
          {message}
        </div>
      )}
    </div>
  )
}

export default App
