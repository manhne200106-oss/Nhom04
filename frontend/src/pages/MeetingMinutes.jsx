import React, { useState, useEffect } from 'react';
import { Sparkles, Save, FileText, Clock, Loader2, Check } from 'lucide-react';
import { meetingNotesApi, aiApi } from '../api';

export default function MeetingMinutes({ currentProjectId }) {
  const [rawNotes, setRawNotes] = useState('');
  const [generatedMinutes, setGeneratedMinutes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotes, setSavedNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentProjectId) fetchNotes();
  }, [currentProjectId]);

  const fetchNotes = async () => {
    try {
      const res = await meetingNotesApi.getByProject(currentProjectId);
      setSavedNotes(res.data);
    } catch (err) {
      console.error('fetchNotes error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!rawNotes.trim()) {
      alert('Vui lòng nhập nội dung ghi chú thô!');
      return;
    }
    setIsProcessing(true);
    const fallback = `### Biên bản cuộc họp\n- **Mục tiêu:** Xây dựng tính năng theo yêu cầu.\n- **Công việc đã thảo luận:** ${rawNotes}\n- **Kế hoạch hành động:** Phân công thành viên thực hiện theo Kanban.`;

    try {
      const res = await aiApi.meetingMinutes(currentProjectId, rawNotes);
      if (res.data?.generated_minutes) {
        setGeneratedMinutes(res.data.generated_minutes);
      } else {
        setGeneratedMinutes(fallback);
      }
    } catch (err) {
      console.error('generate meeting minutes error:', err);
      setGeneratedMinutes(fallback);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!rawNotes.trim() && !generatedMinutes.trim()) {
      alert('Chưa có nội dung để lưu!');
      return;
    }
    setIsSaving(true);
    try {
      await meetingNotesApi.create(currentProjectId, {
        raw_notes: rawNotes,
        ai_minutes: generatedMinutes,
        raw_content: rawNotes,
        generated_minutes: generatedMinutes,
      });
      alert('Đã lưu biên bản cuộc họp thành công!');
      setRawNotes('');
      setGeneratedMinutes('');
      fetchNotes();
    } catch (err) {
      console.error('save meeting note error:', err);
      alert('Lỗi khi lưu biên bản: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentProjectId) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Vui lòng chọn một dự án từ Dashboard trước khi xem Biên bản họp.
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Biên bản cuộc họp</h1>
        <p className="text-xs text-slate-500 mt-1">
          Chuyển đổi ghi chú thô thành biên bản chuẩn cấu trúc với Gemini AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel: Ghi chú thô */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Ghi chú cuộc họp thô
            </h2>
          </div>

          <textarea
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            placeholder="Nhập nội dung cuộc họp thô, các ý thảo luận, người tham gia, công việc phân công..."
            className="flex-1 w-full min-h-[300px] border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
          />

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={isProcessing || !rawNotes.trim()}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  🤖 AI Chuẩn hoá biên bản
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right panel: Biên bản chuẩn hoá */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Biên bản chuẩn hoá bởi AI
            </h2>
            {generatedMinutes && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold shadow-sm transition-all"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Lưu biên bản
              </button>
            )}
          </div>

          <div className="flex-1 w-full min-h-[300px] border border-slate-200 rounded-xl p-4 text-sm bg-slate-50/60 overflow-y-auto whitespace-pre-wrap leading-relaxed text-slate-800">
            {generatedMinutes || (
              <span className="text-slate-400 italic">
                Nội dung biên bản chuẩn hoá sau khi AI phân tích sẽ hiển thị tại đây...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Danh sách các biên bản đã lưu */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-500" />
          Lịch sử biên bản họp đã lưu ({savedNotes.length})
        </h2>

        {loading ? (
          <div className="text-sm text-slate-400 py-6 text-center">Đang tải lịch sử...</div>
        ) : savedNotes.length === 0 ? (
          <div className="text-sm text-slate-400 py-6 text-center">Chưa có biên bản nào được lưu.</div>
        ) : (
          <div className="space-y-4">
            {savedNotes.map((note) => (
              <div
                key={note.id}
                className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-colors"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-100 text-indigo-800">
                    Biên bản #{note.id}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(note.created_at).toLocaleString('vi-VN')}
                  </span>
                </div>
                {note.generated_minutes ? (
                  <div className="text-sm text-slate-800 whitespace-pre-wrap mt-2 bg-white p-4 rounded-lg border border-slate-200">
                    {note.generated_minutes}
                  </div>
                ) : (
                  <div className="text-sm text-slate-600 whitespace-pre-wrap mt-2">
                    {note.raw_content}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
