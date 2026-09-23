import React from 'react';
import { LayoutDashboard, KanbanSquare, FileText, Bot, LogOut, User, Layers } from 'lucide-react';

export default function Sidebar({ user, onLogout, currentPage, setCurrentPage }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kanban', label: 'Bảng Kanban', icon: KanbanSquare },
    { id: 'meeting', label: 'Biên bản họp', icon: FileText },
    { id: 'chatbot', label: 'Trợ lý AI', icon: Bot },
  ];

  return (
    <div className="w-64 bg-slate-900 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-500 p-1.5 rounded-lg">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">TaskMaster AI</span>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{user?.username}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">{user?.role}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentPage === item.id
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-900/40 hover:text-red-400 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}