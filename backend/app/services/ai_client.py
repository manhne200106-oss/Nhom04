import os
import httpx
import json
import logging
import time
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from app.core.config import settings

# Load .env file
load_dotenv()

logger = logging.getLogger(__name__)

# List of official Gemini models to try in order
MODELS = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-latest"]

SYSTEM_INSTRUCTION = (
    "Bạn là trợ lý AI chuyên nghiệp về quản lý dự án Scrum. "
    "Chỉ nhận xét và lập báo cáo dựa trên chính xác dữ liệu dự án được cung cấp. "
    "BẤT KỲ THÔNG TIN NÀO KHÔNG CÓ TRONG DỮ LIỆU ĐỀU KHÔNG ĐƯỢC TỰ BỊA ĐẶT HOẶC SUY ĐOÁN SỐ LIỆU. "
    "Nếu dữ liệu bị thiếu hoặc rỗng, hãy phản hồi rõ: 'Dữ liệu dự án chưa đầy đủ để lập báo cáo'."
)

FALLBACK_MESSAGE = (
    "Dịch vụ Trợ lý AI đang bận, hệ thống sẽ tự động tính toán thống kê theo công thức mặc định."
)


class AIClient:
    """Gọi Google Gemini REST API thuần qua httpx — không phụ thuộc SDK."""

    def __init__(self):
        # Đọc trực tiếp GEMINI_API_KEY từ file .env
        self.api_key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
        self.enabled = bool(self.api_key and self.api_key != "your-gemini-api-key" and self.api_key.strip())

    # ------------------------------------------------------------------ #
    #  Core 1: gọi REST API trả về JSON có cấu trúc
    # ------------------------------------------------------------------ #
    def _call_json(self, user_prompt: str, retries: int = 2) -> Optional[Dict[str, Any]]:
        if not self.enabled:
            print("Gemini Warning: Thiếu GEMINI_API_KEY hoặc chưa được cấu hình.")
            return None

        payload = {
            "system_instruction": {
                "parts": [{"text": SYSTEM_INSTRUCTION}]
            },
            "contents": [
                {"role": "user", "parts": [{"text": user_prompt}]}
            ],
            "generationConfig": {
                "temperature": 0.2,
                "response_mime_type": "application/json"
            },
        }

        for model in MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            for attempt in range(retries):
                try:
                    with httpx.Client(timeout=35.0) as client:
                        resp = client.post(url, json=payload)

                    if resp.status_code == 200:
                        data = resp.json()
                        text = data["candidates"][0]["content"]["parts"][0]["text"]
                        print(f"[Gemini OK] Model {model} sinh JSON thanh cong ({len(text)} ky tu).")
                        return json.loads(text.strip())

                    # In ra log chi tiết trong terminal nếu gặp lỗi để dễ theo dõi
                    print(f"Gemini Response ({model}, status {resp.status_code}):", resp.text[:300])

                    if resp.status_code == 404:
                        # Model không tồn tại hoặc không hỗ trợ -> chuyển ngay sang model tiếp theo
                        break

                    if resp.status_code in (429, 503):
                        time.sleep(1.0)
                        continue

                except httpx.TimeoutException:
                    print(f"Gemini Timeout: Model {model} het thoi gian cho 35s (lan {attempt + 1}/{retries})")
                except Exception as exc:
                    print(f"Gemini Exception ({model}): {exc}")

                if attempt < retries - 1:
                    time.sleep(1.0)

        return None

    # ------------------------------------------------------------------ #
    #  Core 2: gọi REST API trả về Text thường (Markdown)
    # ------------------------------------------------------------------ #
    def _call_with_retry(self, user_prompt: str, retries: int = 2) -> str:
        if not self.enabled:
            print("Gemini Warning: Thiếu GEMINI_API_KEY hoặc chưa được cấu hình.")
            return "Dịch vụ AI chưa được cấu hình. (Thiếu GEMINI_API_KEY trong file .env)"

        payload = {
            "system_instruction": {
                "parts": [{"text": SYSTEM_INSTRUCTION}]
            },
            "contents": [
                {"role": "user", "parts": [{"text": user_prompt}]}
            ],
            "generationConfig": {
                "temperature": 0.2
            },
        }

        for model in MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            for attempt in range(retries):
                try:
                    with httpx.Client(timeout=35.0) as client:
                        resp = client.post(url, json=payload)

                    if resp.status_code == 200:
                        data = resp.json()
                        try:
                            result_text = data["candidates"][0]["content"]["parts"][0]["text"]
                            print(f"[Gemini OK] Model {model} sinh text thanh cong ({len(result_text)} ky tu).")
                            return result_text
                        except (KeyError, IndexError):
                            return json.dumps(data, ensure_ascii=False)

                    print(f"Gemini Response ({model}, status {resp.status_code}):", resp.text[:300])
                    if resp.status_code == 404:
                        break
                    if resp.status_code in (429, 503):
                        time.sleep(1.0)
                        continue

                except httpx.TimeoutException:
                    print(f"Gemini Timeout: Model {model} het thoi gian cho 35s (lan {attempt + 1}/{retries})")
                except Exception as exc:
                    print(f"Gemini Exception: Model {model} loi: {exc}")

                if attempt < retries - 1:
                    time.sleep(1.0)

        return FALLBACK_MESSAGE

    # ------------------------------------------------------------------ #
    #  Nghiệp vụ 1: Tóm tắt tiến độ tuần (chuẩn cấu trúc 4 phần theo SRS)
    # ------------------------------------------------------------------ #
    def summarize_progress(self, project_data: dict) -> Optional[Dict[str, Any]]:
        prompt = (
            "Bạn là chuyên gia phân tích tiến độ Scrum.\n"
            "Hãy phân tích chi tiết dữ liệu tiến độ Sprint 1 của dự án sau:\n\n"
            f"{json.dumps(project_data, ensure_ascii=False, indent=2)}\n\n"
            "Hãy xuất ra báo cáo tóm tắt tiến độ tuần bằng tiếng Việt dưới dạng một đối tượng JSON DUY NHẤT gồm đúng 4 trường:\n"
            "{\n"
            '  "general_evaluation": "Nhận xét tổng thể tỷ lệ hoàn thành, khối lượng công việc, tốc độ của sprint",\n'
            '  "highlights": "Những task đã hoàn thành tốt, đóng góp của các thành viên cụ thể",\n'
            '  "risks": "Các task đang chậm trễ, nguy cơ quá hạn, task đang chờ review hoặc task chưa bắt đầu",\n'
            '  "actions": "Hành động cụ thể cho từng thành viên để đảm bảo hoàn thành mục tiêu sprint"\n'
            "}\n"
            "Yêu cầu: Viết súc tích, chuyên nghiệp, nêu rõ số liệu, tên thành viên (CamTu, DucManh) và các nhiệm vụ cụ thể dựa trên dữ liệu thật."
        )
        return self._call_json(prompt)

    # ------------------------------------------------------------------ #
    #  Nghiệp vụ 2: Gợi ý phân công
    # ------------------------------------------------------------------ #
    def suggest_assignment(self, task_desc: str, req_skills: str, members: list) -> Dict[str, Any]:
        prompt = (
            "Bạn là chuyên gia phân bổ nguồn lực Scrum. "
            "Dựa vào yêu cầu công việc và dữ liệu thành viên (JSON), "
            "hãy đề xuất 1 người phù hợp nhất. "
            "Ưu tiên người có kỹ năng khớp và đang có số Task 'IN_PROGRESS' thấp nhất.\n\n"
            f"Task cần giao: {task_desc}\n"
            f"Yêu cầu kỹ năng: {req_skills}\n"
            f"Danh sách Member:\n{json.dumps(members, ensure_ascii=False)}\n\n"
            "Trả về DUY NHẤT một đối tượng JSON (không kèm backtick hay text thừa) "
            'gồm "assignee_id", "assignee_name", và "reason".'
        )
        raw = self._call_with_retry(prompt)
        try:
            cleaned = raw.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())
        except Exception:
            return {"error": "Không thể parse JSON từ AI", "raw": raw}

    # ------------------------------------------------------------------ #
    #  Nghiệp vụ 3: Sinh biên bản họp
    # ------------------------------------------------------------------ #
    def generate_meeting_minutes(self, raw_notes: str) -> str:
        fallback_template = (
            "### Biên bản cuộc họp\n"
            "- **Mục tiêu:** Xây dựng tính năng theo yêu cầu.\n"
            f"- **Công việc đã thảo luận:** {raw_notes}\n"
            "- **Kế hoạch hành động:** Phân công thành viên thực hiện theo Kanban."
        )

        if not self.enabled:
            return fallback_template

        prompt = (
            "Hãy chuyển đổi ghi chú cuộc họp thô sau thành biên bản họp chuẩn cấu trúc:\n"
            "- Mục tiêu cuộc họp\n"
            "- Nội dung thảo luận\n"
            "- Quyết định\n"
            "- Action Items (ai làm gì, deadline)\n\n"
            "Chỉ dựa trên thông tin được cung cấp, KHÔNG BỊA ĐẶT thêm.\n\n"
            f"Ghi chú thô:\n{raw_notes}"
        )
        try:
            result = self._call_with_retry(prompt)
            if not result or result == FALLBACK_MESSAGE or "Dịch vụ AI chưa được cấu hình" in result:
                return fallback_template
            return result
        except Exception as e:
            logger.error(f"Error generating meeting minutes: {e}")
            return fallback_template

    # ------------------------------------------------------------------ #
    #  Nghiệp vụ 4: Chatbot trợ lý
    # ------------------------------------------------------------------ #
    def chat(self, user_message: str, context: str = "") -> str:
        prompt = (
            "Bạn là trợ lý ảo AI chuyên nghiệp của hệ thống quản lý dự án TaskMaster AI.\n"
            "Dưới đây là dữ liệu thời gian thực của dự án, bao gồm ngày hiện tại, danh sách thành viên, số lượng công việc, danh sách các task quá hạn (overdue_tasks) và toàn bộ các nhiệm vụ (all_tasks).\n\n"
            "QUY TẮC BẮT BUỘC KHI TRẢ LỜI:\n"
            "1. Khi người dùng hỏi về task quá hạn, trễ hạn, deadline:\n"
            "   - Bạn PHẢI đọc trường 'overdue_count' và danh sách 'overdue_tasks' trong dữ liệu.\n"
            "   - Liệt kê đầy đủ và chi tiết TỪNG task quá hạn kèm theo:\n"
            "     + Tên task\n"
            "     + Người đang phụ trách (assignee: CamTu hoặc DucManh)\n"
            "     + Trạng thái hiện tại (status: IN_PROGRESS, REVIEW, TODO...)\n"
            "     + Hạn chót (due_date)\n"
            "   - Tuyệt đối KHÔNG ĐƯỢC trả lời rằng 'không có thông tin due date' vì thông tin hạn chót đã được cung cấp đầy đủ.\n"
            "2. Khi người dùng hỏi về tiến độ, ai đang làm gì, tổng số task: trả lời chính xác, rõ ràng dựa trên danh sách nhiệm vụ.\n"
            "3. Trả lời bằng tiếng Việt, văn phong chuyên nghiệp, định dạng gạch đầu dòng Markdown rõ ràng.\n\n"
            f"=== DỮ LIỆU THỜI GIAN THỰC CỦA DỰ ÁN ===\n{context}\n\n"
            f"=== CÂU HỎI CỦA NGƯỜI DÙNG ===\n{user_message}"
        )
        return self._call_with_retry(prompt)


ai_service = AIClient()
