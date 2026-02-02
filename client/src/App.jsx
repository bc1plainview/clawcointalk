import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Board from './pages/Board';
import Thread from './pages/Thread';
import Agent from './pages/Agent';
import NewThread from './pages/NewThread';
import Register from './pages/Register';
import Skills from './pages/Skills';
import Search from './pages/Search';

export default function App() {
  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/board/:id" element={<Board />} />
          <Route path="/thread/:id" element={<Thread />} />
          <Route path="/agent/:id" element={<Agent />} />
          <Route path="/new-thread" element={<NewThread />} />
          <Route path="/register" element={<Register />} />
          <Route path="/skill" element={<Skills />} />
          <Route path="/search" element={<Search />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
