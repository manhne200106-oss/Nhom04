import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2 } from 'lucide-react';
import { aiApi } from '../api';

export default function AIChatbot({ currentProjectId }) {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content:
        'Chào bạn! Tôi là trợ lý ảo AI của TaskMaster. Bạn có thể hỏi tôi về tiến độ sprint, tình trạng công việc, thành viên đảm nhận hoặc phân bổ task!',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentProjectId) return;

    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiApi.chatAssistant(currentProjectId, userMsg);
      setMessages((prev) => [...prev, { role: 'ai', content: res.data.reply }]);
    } catch (err) {
      console.error('AIChatbot error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: 'Xin lỗi, có lỗi xảy ra khi kết nối với AI Trợ lý. Vui lòng thử lại sau.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!currentProjectId) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Vui lòng chọn một dự án từ Dashboard để sử dụng Trợ lý AI.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto p-4 md:p-8 space-y-4">
      <div className="bg-white border border-slate-200 p-5 flex items-center gap-3.5 rounded-2xl shadow-sm">
        <div className="bg-purple-100 p-2.5 rounded-xl border border-purple-200">
          <Bot className="w-6 h-6 text-purple-700" />
        </div>
        <div>
          <h1 className="font-extrabold text-slate-900 text-lg tracking-tight">Trợ lý AI Dự án</h1>
          <p className="text-xs text-slate-500">
            Hỏi đáp thông minh về số liệu tiến độ, nhiệm vụ và các thành viên dựa trên dữ liệu thật
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
          {messages.map((m, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${
                m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-purple-600 text-white shadow-sm'
                }`}
              >
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs whitespace-pre-wrap'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span>Trợ lý AI đang suy nghĩ...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Đặt câu hỏi về dự án, tiến độ task, ai đang làm gì..."
            className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Gửi</span>
          </button>
        </form>
      </div>
    </div>
  );
}
