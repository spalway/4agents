import { HashRouter, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import Seat from './pages/Seat'

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:slug" element={<Seat />} />
        </Routes>
      </div>
    </HashRouter>
  )
}
