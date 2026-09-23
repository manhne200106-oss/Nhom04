import React, { useState, useEffect } from 'react';
import {
  Clipboard, CheckCircle2, Clock, AlertCircle,
  Sparkles, FolderOpen, Plus, X, Loader2, TrendingUp, Check,
  Compass, BarChart3
} from 'lucide-react';
import { projectsApi, membersApi, tasksApi, sprintsApi, aiApi } from '../api';

function AiSummaryViewer({ text }) {
  if (!text) return null;

  // Split by markdown headers like ### 1., ### 2., etc.
  const rawSections = text.split(/(?=###\s*[1-4]\.)/);

  if (rawSections.length >= 2) {
    return (
      <div className="space-y-3 mt-3">
        {rawSections.map((sec, idx) => {
          const trimmed = sec.trim();
          if (!trimmed) return null;

          const lines = trimmed.split('\n');
          const titleLine = lines[0].replace(/^###\s*/, '').trim();
          const body = lines.slice(1).join('\n').trim();

          let theme = {
            border: 'border-l-indigo-500',
            titleColor: 'text-indigo-900',
            icon: BarChart3,
            iconColor: 'text-indigo-600',
            badgeBg: 'bg-indigo-100 text-indigo-800',
          };

          if (titleLine.includes('Điểm sáng') || titleLine.startsWith('2.')) {
            theme = {
              border: 'border-l-emerald-500',
              titleColor: 'text-emerald-900',
              icon: CheckCircle2,
              iconColor: 'text-emerald-600',
              badgeBg: 'bg-emerald-100 text-emerald-800',
            };
          } else if (titleLine.includes('Rủi ro') || titleLine.includes('Trở ngại') || titleLine.startsWith('3.')) {
            theme = {
              border: 'border-l-rose-500',
              titleColor: 'text-rose-900',
              icon: AlertCircle,
              iconColor: 'text-rose-600',
              badgeBg: 'bg-rose-100 text-rose-800',
            };
          } else if (titleLine.includes('Đề xuất') || titleLine.startsWith('4.')) {
            theme = {
              border: 'border-l-amber-500',
              titleColor: 'text-amber-900',
              icon: Compass,
              iconColor: 'text-amber-600',
              badgeBg: 'bg-amber-100 text-amber-800',
            };
          }

          const IconComponent = theme.icon;

          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border border-slate-200/90 bg-white border-l-4 ${theme.border} shadow-2xs space-y-2`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <IconComponent className={`w-4 h-4 ${theme.iconColor}`} />
                <span className={theme.titleColor}>{titleLine}</span>
              </div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed pl-6">
                {body}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-white p-4 rounded-xl border border-slate-200">
      {text}
    </div>
  );
}

export default function Dashboard({ user, currentProjectId, setCurrentProjectId, setCurrentPage }) {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Project Modal state
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [creatingProject, setCreatingProject] = useState(false);
  const [createError, setCreateError] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // AI Summary state
  const [aiSummary, setAiSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [aiError, setAiError] = useState('');

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (currentProjectId) {
      fetchProjectDetails(currentProjectId);
    }
  }, [currentProjectId]);

  const fetchProjects = async () => {
    try {
      const res = await projectsApi.getAll();
      setProjects(res.data);
      if (res.data.length > 0 && !currentProjectId) {
        setCurrentProjectId(res.data[0].id);
      }
    } catch (err) {
      console.error('fetchProjects error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (id) => {
    try {
      const [statsRes, membersRes, tasksRes, sprintsRes] = await Promise.all([
        projectsApi.getStats(id),
        membersApi.getByProject(id),
        tasksApi.getByProject(id),
        sprintsApi.getByProject(id),
      ]);
      setStats(statsRes.data);
      setMembers(membersRes.data);
      setTasks(tasksRes.data);
      setSprints(sprintsRes.data);
      setAiSummary('');
      setAiError('');
    } catch (err) {
      console.error('fetchProjectDetails error:', err);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProject.name.trim()) {
      alert('Vui lòng nhập tên dự án!');
      return;
    }

    setCreatingProject(true);
    setCreateError('');

    try {
      const payload = {
        name: newProject.name.trim(),
        description: newProject.description.trim(),
      };

      const res = await projectsApi.create(payload);
      const created = res.data;

      // Close modal immediately
      setShowModal(false);
      setNewProject({ name: '', description: '' });

      // Show success feedback
      setToastMessage({ type: 'success', text: `Tạo dự án "${created.name}" thành công!` });

      // Refetch projects list and automatically select newly created project
      const listRes = await projectsApi.getAll();
      setProjects(listRes.data);
      setCurrentProjectId(created.id);
    } catch (err) {
      console.error('createProject error:', err);
      const msg = err.response?.data?.detail || err.message || 'Không thể tạo dự án';
      setCreateError(msg);
      alert(`Lỗi khi tạo dự án: ${msg}`);
    } finally {
      setCreatingProject(false);
    }
  };

  const getAiSummary = async () => {
    if (!currentProjectId || summarizing) return;
    setSummarizing(true);
    setAiSummary('');
    setAiError('');

    try {
      const res = await aiApi.summarizeProgress(currentProjectId);
      setAiSummary(res.data.summary || 'Không có phản hồi từ AI.');
    } catch (err) {
      console.error('AI summary error:', err);
      const msg = err.response?.data?.detail || 'Không thể kết nối dịch vụ AI. Vui lòng kiểm tra API Key.';
      setAiError(msg);
      alert(msg);
    } finally {
      setSummarizing(false);
    }
  };

  const navigateToKanban = (id) => {
    setCurrentProjectId(id);
    setCurrentPage('kanban');
  };

  // Derive active sprint name
  const currentSprint = sprints.length > 0 ? sprints[0] : null;
  const sprintTitle = currentSprint ? currentSprint.name : 'Sprint 1';

  // Member Workload calculations
  const memberWorkload = members.map((m) => {
    const mt = tasks.filter((t) => t.assignee_id === m.user_id);
    return {
      ...m,
      todo: mt.filter((t) => t.status === 'TODO').length,
      inProgress: mt.filter((t) => t.status === 'IN_PROGRESS').length,
      review: mt.filter((t) => t.status === 'REVIEW').length,
      done: mt.filter((t) => t.status === 'DONE').length,
      total: mt.length,
    };
  });

  const selectedProject = projects.find((p) => p.id === currentProjectId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mr-3" />
        <span className="text-base font-medium">Đang tải Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <Check className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* ── Tiêu đề trang: "Dashboard Sprint 1" kèm nút tím "🤖 Yêu cầu AI Tóm tắt" ── */}
      <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Dashboard {sprintTitle}
            </h1>
            {selectedProject && (
              <span className="bg-indigo-50 text-indigo-700 text-xs px-3 py-1 rounded-full font-semibold border border-indigo-100">
                {selectedProject.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng quan tiến độ nhiệm vụ và phân bổ khối lượng công việc nhóm
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={getAiSummary}
            disabled={summarizing || !currentProjectId}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            {summarizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang phân tích...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                🤖 Yêu cầu AI Tóm tắt
              </>
            )}
          </button>

          <button
            onClick={() => {
              setShowModal(true);
              setCreateError('');
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Tạo Dự án
          </button>
        </div>
      </div>

      {/* ── Hàng 4 Card chỉ số thống kê trên cùng (Grid 4 cột) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Tổng Task (icon Clipboard) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-100">
            <Clipboard className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{stats?.total_tasks || 0}</div>
            <div className="text-xs font-medium text-slate-500">Tổng Task</div>
          </div>
        </div>

        {/* Card 2: Hoàn thành (icon CheckCircle - màu xanh lá) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700">{stats?.done || 0}</div>
            <div className="text-xs font-medium text-slate-500">Hoàn thành</div>
          </div>
        </div>

        {/* Card 3: Đang thực hiện (icon Clock - màu vàng cam) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-100">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{stats?.in_progress || 0}</div>
            <div className="text-xs font-medium text-slate-500">Đang thực hiện</div>
          </div>
        </div>

        {/* Card 4: Quá hạn (icon AlertCircle - màu đỏ) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-100">
            <AlertCircle className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600">{stats?.overdue || 0}</div>
            <div className="text-xs font-medium text-slate-500">Quá hạn</div>
          </div>
        </div>
      </div>

      {/* ── Thanh tiến độ Sprint ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <span>Tiến độ {sprintTitle}</span>
          </div>
          <span className="text-sm font-bold text-indigo-600">
            {stats ? `${stats.done}/${stats.total_tasks} Task – ${stats.completion_rate}%` : '0/0 Task – 0%'}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3.5 rounded-full transition-all duration-700"
            style={{ width: `${stats?.completion_rate || 0}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-6 text-xs text-slate-500 font-medium">
          <span className="text-emerald-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Hoàn thành: {stats?.done || 0}
          </span>
          <span className="text-amber-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Đang làm: {stats?.in_progress || 0}
          </span>
          <span className="text-purple-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            Review: {stats?.review || 0}
          </span>
          <span className="text-slate-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            To Do: {stats?.todo || 0}
          </span>
        </div>
      </div>

      {/* ── Khung AI Tóm tắt tiến độ tuần (kết quả hiển thị khi bấm nút) ── */}
      {(aiSummary || aiError || summarizing) && (
        <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-purple-200/60 pb-3">
            <div className="flex items-center gap-2 font-bold text-purple-900 text-base">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span>Báo cáo AI Tóm tắt tiến độ tuần</span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-purple-200/60 text-purple-800 rounded-lg">
              Gemini 2.5 Flash
            </span>
          </div>

          {summarizing && (
            <div className="flex items-center gap-3 py-6 justify-center text-purple-700 text-sm font-medium">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang thu thập dữ liệu nhiệm vụ và phân tích tiến độ tuần...</span>
            </div>
          )}

          {aiError && (
            <div className="text-sm text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200">
              {aiError}
            </div>
          )}

          {aiSummary && <AiSummaryViewer text={aiSummary} />}
        </div>
      )}

      {/* ── Lưới dưới: Danh sách Dự án + Bảng Khối lượng công việc thành viên ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Danh sách Dự án */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">Danh sách Dự án</h3>
            <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
              {projects.length} dự án
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              Chưa có dự án nào. Hãy bấm "Tạo Dự án" phía trên!
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto flex-1">
              {projects.map((p) => (
                <li
                  key={p.id}
                  onClick={() => setCurrentProjectId(p.id)}
                  className={`p-4 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-between transition-colors ${
                    currentProjectId === p.id ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FolderOpen
                      className={`w-5 h-5 shrink-0 ${
                        currentProjectId === p.id ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 text-sm truncate">{p.name}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {p.description || 'Không có mô tả'} • {new Date(p.created_at).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToKanban(p.id);
                    }}
                    className="ml-3 shrink-0 text-xs text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors"
                  >
                    Mở Kanban →
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Bảng Khối lượng công việc thành viên ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60">
            <h3 className="font-bold text-slate-800 text-sm">Khối lượng công việc thành viên</h3>
          </div>

          {memberWorkload.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              Chọn một dự án để xem khối lượng công việc của từng thành viên.
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                    <th className="px-4 py-3 text-left">Thành viên</th>
                    <th className="px-3 py-3 text-left">Vai trò</th>
                    <th className="px-3 py-3 text-center">TODO</th>
                    <th className="px-3 py-3 text-center">IN PROGRESS</th>
                    <th className="px-3 py-3 text-center">REVIEW</th>
                    <th className="px-3 py-3 text-center">DONE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberWorkload.map((m) => (
                    <tr key={m.user_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">
                            {m.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-sm">{m.username}</div>
                            {m.is_leader && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                                Leader
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600 text-xs font-medium uppercase">
                        {m.role}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs font-semibold">
                          {m.todo}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md text-xs font-semibold">
                          {m.inProgress}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md text-xs font-semibold">
                          {m.review}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-xs font-semibold">
                          {m.done}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Tạo Dự Án ── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Tạo Dự án Mới</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setCreateError('');
                }}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              {createError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên dự án <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Ví dụ: TaskMaster AI, Website Bán hàng..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô tả dự án
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Mô tả mục tiêu, phạm vi dự án..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  rows="3"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setCreateError('');
                  }}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingProject}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {creatingProject && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creatingProject ? 'Đang tạo...' : 'Tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
