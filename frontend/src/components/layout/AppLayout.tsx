import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { ToastContainer } from '../common/ToastContainer';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden font-sans text-zinc-900 print:h-auto print:overflow-visible print:bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-zinc-50/50 print:overflow-visible print:p-0 print:bg-white">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
};

export default AppLayout;
