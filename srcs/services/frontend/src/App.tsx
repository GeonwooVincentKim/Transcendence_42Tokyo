import { PongGame } from './components/PongGame'

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl mb-8">Pong Game</h1>
        <PongGame />
      </div>
    </div>
  )
}

export default App
