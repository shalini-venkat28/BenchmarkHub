import React, { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Sidebar from './components/layout/Sidebar'
import ChatbotPanel from './components/chatbot/ChatbotPanel'
import HomePage from './pages/HomePage'
import ModelDetailPage from './pages/ModelDetailPage'
import AddBenchmarkPage from './pages/AddBenchmarkPage'
import LeaderboardPage from './pages/LeaderboardPage'
import BulkImportPage from './pages/BulkImportPage'
import AuthPage from './pages/AuthPage'
import { subscribeToModels } from './services/benchmarkService'
import { subscribeToAuth } from './services/authService'

export default function App() {
  const [models, setModels]       = useState([])
  const [chatOpen, setChatOpen]   = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser]           = useState(undefined) // undefined = loading

  // Auth listener
  useEffect(() => {
    const unsub = subscribeToAuth(u => setUser(u))
    return unsub
  }, [])

  // Real-time Firestore subscription (only when logged in)
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToModels(setModels)
    return unsub
  }, [user])

  // Loading splash while Firebase resolves auth state
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    )
  }

  // Not logged in → show auth page
  if (!user) {
    return <AuthPage />
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar
        user={user}
        onMenuToggle={() => setSidebarOpen(v => !v)}
        onChatToggle={() => setChatOpen(v => !v)}
        chatOpen={chatOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left sidebar */}
        <Sidebar
          models={models}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="max-w-7xl mx-auto px-4 py-6 lg:px-8">
            <Routes>
              <Route path="/"            element={<HomePage models={models} />} />
              <Route path="/leaderboard" element={<LeaderboardPage models={models} />} />
              <Route path="/add"         element={<AddBenchmarkPage models={models} />} />
              <Route path="/bulk-import" element={<BulkImportPage models={models} />} />
              <Route path="/model/:slug" element={<ModelDetailPage models={models} />} />
            </Routes>
          </div>
        </main>

        {/* Right chatbot panel */}
        {chatOpen && (
          <ChatbotPanel
            models={models}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
