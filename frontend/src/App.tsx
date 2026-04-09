import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TranslatorPage from './pages/TranslatorPage';
import AboutPage from './pages/AboutPage';
import Navbar from './components/ui/Navbar';
import ToastContainer from './components/ui/ToastContainer';

function App() {
  return (
    <Router>
      <Navbar />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<TranslatorPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </Router>
  );
}

export default App;
