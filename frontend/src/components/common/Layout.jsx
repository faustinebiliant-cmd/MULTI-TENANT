// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Layout
// ============================================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from './CommandPalette';

const Layout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <Outlet />
      </div>
      {/* Cmd/Ctrl+K anywhere in the app opens this, or the Search
          pill in Header. See CommandPalette.jsx for the searchData
          hook point if you want to wire in live product/customer search. */}
      <CommandPalette />
    </div>
  );
};

export default Layout;