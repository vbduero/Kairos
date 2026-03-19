import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TranslatorPage from './pages/TranslatorPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TranslatorPage />} />
      </Routes>
    </Router>
  );
}

export default App;
