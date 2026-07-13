import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home';

/**
 * Simplified routing for the ML Dynamic Pricing Demo.
 * - Root `/` goes directly to Home (the fare prediction interface).
 * - All auth, captain, and driver routes have been removed.
 * - No login wall, no protect wrappers.
 */
const App = () => {
  return (
    <div>
      <Routes>
        <Route path='/' element={<Home />} />
        {/* Catch-all: redirect any unknown path back to the demo */}
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </div>
  );
};

export default App;