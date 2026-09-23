import React, { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { authApi } from '../api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await authApi.login(username.trim(), password);

      if (res.data && res.data.access_token) {
        onLogin(res.data);
      } else {
        setError('Dữ liệu máy chủ trả về không hợp lệ.');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response) {
        setError(err.response.data?.detail || `Lỗi máy chủ (${err.response.status})`);
      } else if (err.request) {
        setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend.');
      } else {
        setError('Lỗi không xác định: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-50 p-3.5 rounded-2xl mb-4 border border-indigo-100">
            <Lock className="w-7 h-7 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Đăng nhập hệ thống</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">TaskMaster AI – Quản lý dự án nhóm</p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 p-3.5 rounded-xl mb-5 text-sm border border-rose-200 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-3 px-4 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
