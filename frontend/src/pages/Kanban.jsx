import React, { useState, useEffect } from 'react';
import { Plus, Search, Sparkles, X, Edit2, Trash2, Loader2, Check } from 'lucide-react';
import { tasksApi, membersApi, sprintsApi, aiApi } from '../api';

export default function Kanban({ currentProjectId }) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    assignee_id: '',
    sprint_id: '',
    due_date: '',
    required_skills: '',
    status: 'TODO',
  });

  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (currentProjectId) fetchData();
  }, [currentProjectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, membersRes, sprintsRes] = await Promise.all([
        tasksApi.getByProject(currentProjectId),
        membersApi.getByProject(currentProjectId),
        sprintsApi.getByProject(currentProjectId),
      ]);
      setTasks(tasksRes.data);
      setMembers(membersRes.data);
      setSprints(sprintsRes.data);
    } catch (err) {
      console.error('fetchData error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('taskId');
    if (!taskIdStr) return;
    const taskId = parseInt(taskIdStr, 10);
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic UI update
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    try {
      await tasksApi.updateStatus(taskId, newStatus);
    } catch (err) {
      console.error('updateStatus error:', err);
      fetchData(); // revert on fail
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      alert('Vui lòng nhập tiêu đề task!');
      return;
    }

    try {
      let assigneeId = null;
      if (newTask.assignee_id && newTask.assignee_id.toString().trim() !== '') {
        const valStr = newTask.assignee_id.toString().trim();
        const parsed = parseInt(valStr, 10);
        if (!isNaN(parsed)) {
          assigneeId = parsed;
        } else {
          const found = members.find((m) => m.username === valStr);
          assigneeId = found ? found.user_id : valStr;
        }
      }

      let sprintId = null;
      if (newTask.sprint_id && newTask.sprint_id.toString().trim() !== '') {
        const parsed = parseInt(newTask.sprint_id.toString().trim(), 10);
        if (!isNaN(parsed)) {
          sprintId = parsed;
        }
      }

      let dueDate = null;
      if (newTask.due_date && newTask.due_date.trim() !== '') {
        dueDate = newTask.due_date.split('T')[0];
      }

      const payload = {
        title: newTask.title.trim(),
        description: newTask.description?.trim() || '',
        priority: newTask.priority || 'MEDIUM',
        assignee_id: assigneeId,
        sprint_id: sprintId,
        due_date: dueDate,
        required_skills: newTask.required_skills?.trim() || '',
      };

      await tasksApi.create(currentProjectId, payload);
      setShowCreateModal(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'MEDIUM',
        assignee_id: '',
        sprint_id: '',
        due_date: '',
        required_skills: '',
        status: 'TODO',
      });
      setToastMessage({ type: 'success', text: 'Tạo nhiệm vụ mới thành công!' });
      // Refetch full task list to get formatted dates, assignee names
      await fetchData();
    } catch (err) {
      console.error('createTask error:', err);
      alert('Lỗi khi tạo nhiệm vụ: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!activeTask) return;
    try {
      let assigneeId = null;
      if (activeTask.assignee_id && activeTask.assignee_id.toString().trim() !== '') {
        const valStr = activeTask.assignee_id.toString().trim();
        const parsed = parseInt(valStr, 10);
        if (!isNaN(parsed)) {
          assigneeId = parsed;
        } else {
          const found = members.find((m) => m.username === valStr);
          assigneeId = found ? found.user_id : valStr;
        }
      }

      let sprintId = null;
      if (activeTask.sprint_id && activeTask.sprint_id.toString().trim() !== '') {
        const parsed = parseInt(activeTask.sprint_id.toString().trim(), 10);
        if (!isNaN(parsed)) {
          sprintId = parsed;
        }
      }

      let dueDate = null;
      if (activeTask.due_date && activeTask.due_date.toString().trim() !== '') {
        dueDate = activeTask.due_date.toString().split('T')[0];
      }

      const payload = {
        title: activeTask.title,
        description: activeTask.description,
        priority: activeTask.priority,
        status: activeTask.status,
        assignee_id: assigneeId,
        sprint_id: sprintId,
        due_date: dueDate,
        required_skills: activeTask.required_skills,
      };

      const res = await tasksApi.update(activeTask.id, payload);
      setTasks(tasks.map((t) => (t.id === activeTask.id ? res.data : t)));
      setShowDetailModal(false);
      setToastMessage({ type: 'success', text: 'Cập nhật nhiệm vụ thành công!' });
      await fetchData();
    } catch (err) {
      console.error('updateTask error:', err);
      alert('Lỗi cập nhật nhiệm vụ: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này?')) return;
    try {
      await tasksApi.delete(id);
      setTasks(tasks.filter((t) => t.id !== id));
      setShowDetailModal(false);
      setToastMessage({ type: 'success', text: 'Đã xóa nhiệm vụ!' });
    } catch (err) {
      console.error('deleteTask error:', err);
      alert('Lỗi khi xóa nhiệm vụ: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleAiSuggest = async () => {
    if (!newTask.title.trim()) {
      alert('Vui lòng nhập tiêu đề task trước để AI phân tích!');
      return;
    }
    setAiSuggesting(true);
    try {
      const res = await aiApi.suggestAssignment(
        currentProjectId,
        newTask.title,
        newTask.required_skills
      );
      if (res.data.assignee_id) {
        setNewTask({ ...newTask, assignee_id: res.data.assignee_id.toString() });
        alert(`🤖 AI Đề xuất phân công:\n• Người phù hợp: ${res.data.assignee_name}\n• Lý do: ${res.data.reason}`);
      } else if (res.data.error) {
        alert(res.data.error);
      }
    } catch (err) {
      console.error('aiSuggest error:', err);
      alert('Có lỗi khi gọi gợi ý từ AI.');
    } finally {
      setAiSuggesting(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchKey = t.title.toLowerCase().includes(filterKeyword.toLowerCase());
    const matchAssignee = filterAssignee
      ? t.assignee_id?.toString() === filterAssignee.toString()
      : true;
    return matchKey && matchAssignee;
  });

  const cols = [
    { id: 'TODO', title: 'To Do', badgeColor: 'bg-slate-200 text-slate-700', colBg: 'bg-slate-100/70' },
    { id: 'IN_PROGRESS', title: 'In Progress', badgeColor: 'bg-amber-100 text-amber-800', colBg: 'bg-amber-50/50' },
    { id: 'REVIEW', title: 'Review', badgeColor: 'bg-purple-100 text-purple-800', colBg: 'bg-purple-50/50' },
    { id: 'DONE', title: 'Done', badgeColor: 'bg-emerald-100 text-emerald-800', colBg: 'bg-emerald-50/50' },
  ];

  if (!currentProjectId) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Vui lòng chọn một dự án từ Dashboard trước khi xem Bảng Kanban.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mr-3" />
        <span className="text-base font-medium">Đang tải bảng Kanban...</span>
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Filter Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Bảng Kanban</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kéo thả nhiệm vụ để cập nhật trạng thái thời gian thực</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nhiệm vụ..."
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-56 transition-all"
            />
          </div>

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700 font-medium"
          >
            <option value="">Tất cả thành viên</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.username}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Tạo Task
          </button>
        </div>
      </div>

      {/* 4 Kanban Columns */}
      <div className="flex-1 overflow-x-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 h-full min-w-[900px] pb-4">
          {cols.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className={`flex flex-col rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden ${col.colBg}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column header */}
                <div className="p-4 border-b border-slate-200/60 bg-white/70 backdrop-blur-xs flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-sm tracking-wide">{col.title}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${col.badgeColor}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Task list */}
                <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[350px]">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => {
                        setActiveTask({ ...task });
                        setShowDetailModal(true);
                      }}
                      className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                            task.priority === 'HIGH'
                              ? 'bg-rose-100 text-rose-700'
                              : task.priority === 'LOW'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {task.priority}
                        </span>
                        {task.story_points ? (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                            {task.story_points} pts
                          </span>
                        ) : null}
                      </div>

                      <h4 className="text-sm font-semibold text-slate-900 mb-1.5 leading-snug group-hover:text-indigo-600 transition-colors">
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold">
                            {task.assignee_name ? task.assignee_name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="truncate max-w-[90px] font-medium text-slate-700">
                            {task.assignee_name || 'Chưa giao'}
                          </span>
                        </div>

                        {task.due_date && (
                          <span className="text-[11px] font-medium text-slate-400">
                            {new Date(task.due_date).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400">
                      Kéo task vào đây
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Tạo Task Mới */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Tạo Nhiệm vụ Mới</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tiêu đề <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Ví dụ: Thiết kế giao diện Dashboard..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô tả
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Chi tiết công việc cần thực hiện..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Độ ưu tiên
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hạn chót
                  </label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sprint
                  </label>
                  <select
                    value={newTask.sprint_id}
                    onChange={(e) => setNewTask({ ...newTask, sprint_id: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Không gán Sprint</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Người phụ trách
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={newTask.assignee_id}
                      onChange={(e) => setNewTask({ ...newTask, assignee_id: e.target.value })}
                      className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">Chưa phân công</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.username}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAiSuggest}
                      disabled={aiSuggesting}
                      className="bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 px-3 py-2 rounded-xl flex items-center justify-center text-xs font-semibold disabled:opacity-50 transition-colors"
                      title="Yêu cầu AI phân tích kỹ năng và đề xuất người phù hợp"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" /> AI
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kỹ năng yêu cầu (đầu vào cho AI phân tích)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: React, Frontend, Python, Database..."
                  value={newTask.required_skills}
                  onChange={(e) => setNewTask({ ...newTask, required_skills: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors"
                >
                  Tạo Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chi tiết & Sửa Task */}
      {showDetailModal && activeTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Chi tiết Nhiệm vụ #{activeTask.id}</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteTask(activeTask.id)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Xóa task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateTask} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tiêu đề
                </label>
                <input
                  required
                  type="text"
                  value={activeTask.title}
                  onChange={(e) => setActiveTask({ ...activeTask, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô tả
                </label>
                <textarea
                  value={activeTask.description || ''}
                  onChange={(e) => setActiveTask({ ...activeTask, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Độ ưu tiên
                  </label>
                  <select
                    value={activeTask.priority}
                    onChange={(e) => setActiveTask({ ...activeTask, priority: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trạng thái
                  </label>
                  <select
                    value={activeTask.status}
                    onChange={(e) => setActiveTask({ ...activeTask, status: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-semibold"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Người phụ trách
                  </label>
                  <select
                    value={activeTask.assignee_id || ''}
                    onChange={(e) => setActiveTask({ ...activeTask, assignee_id: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Chưa phân công</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hạn chót
                  </label>
                  <input
                    type="date"
                    value={activeTask.due_date ? activeTask.due_date.split('T')[0] : ''}
                    onChange={(e) => setActiveTask({ ...activeTask, due_date: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Edit2 className="w-4 h-4" /> Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
