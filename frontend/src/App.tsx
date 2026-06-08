import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TranslatorPage from './pages/TranslatorPage';

import RecordPage from './pages/RecordPage';
import Navbar from './components/ui/Navbar';
import ToastContainer from './components/ui/ToastContainer';

function App() {
  return (
    <Router>
      <Navbar />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<TranslatorPage />} />

        <Route path="/grabar" element={<RecordPage />} />
      </Routes>
    </Router>
  );
}

export default App;
