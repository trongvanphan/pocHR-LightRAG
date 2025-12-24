# 📚 Hướng Dẫn Sử Dụng LightRAG

## 🎯 Giới Thiệu

**LightRAG** là hệ thống **Retrieval-Augmented Generation (RAG)** dựa trên Knowledge Graph, được phát triển bởi đội ngũ HKUDS. Hệ thống này kết hợp đồ thị tri thức (Knowledge Graph) với vector embeddings để cải thiện độ chính xác của việc tìm kiếm và trả lời câu hỏi.

### ✨ Tính Năng Chính
- **Knowledge Graph RAG**: Xây dựng đồ thị tri thức từ tài liệu
- **Web UI trực quan**: Giao diện web để quản lý tài liệu và truy vấn
- **API tương thích Ollama**: Tích hợp dễ dàng với các chatbot AI
- **Đa dạng LLM**: Hỗ trợ OpenAI, Ollama, Azure OpenAI, Gemini, AWS Bedrock
- **Nhiều lựa chọn lưu trữ**: PostgreSQL, Neo4j, MongoDB, Milvus, Redis, Qdrant

---

## ⚡ Cài Đặt Nhanh

### Yêu Cầu Hệ Thống
- **Python**: >= 3.10
- **Package Manager**: [uv](https://docs.astral.sh/uv/) (khuyến nghị) hoặc pip
- **RAM**: Khuyến nghị >= 8GB
- **LLM**: Cần có API key (OpenAI, Ollama, Gemini, v.v.)

### Bước 1: Clone Repository
```bash
git clone https://github.com/HKUDS/LightRAG.git
cd LightRAG
```

### Bước 2: Cài Đặt Dependencies
```bash
# Sử dụng uv (khuyến nghị)
uv sync --extra api

# Kích hoạt virtual environment
source .venv/bin/activate  # Linux/macOS
# hoặc: .venv\Scripts\activate  # Windows
```

### Bước 3: Cấu Hình Environment
```bash
# Copy file cấu hình mẫu
cp env.example .env

# Chỉnh sửa file .env với thông tin LLM của bạn
nano .env  # hoặc sử dụng editor khác
```

---

## ⚙️ Cấu Hình Quan Trọng (File .env)

### Cấu Hình LLM (Bắt Buộc)

#### Sử Dụng OpenAI:
```env
LLM_BINDING=openai
LLM_MODEL=gpt-4o
LLM_BINDING_HOST=https://api.openai.com/v1
LLM_BINDING_API_KEY=sk-your-api-key-here

EMBEDDING_BINDING=openai
EMBEDDING_MODEL=text-embedding-3-large
EMBEDDING_DIM=3072
EMBEDDING_BINDING_HOST=https://api.openai.com/v1
EMBEDDING_BINDING_API_KEY=sk-your-api-key-here
```

#### Sử Dụng Ollama (Chạy Local):
```env
LLM_BINDING=ollama
LLM_MODEL=qwen2.5:32b
LLM_BINDING_HOST=http://localhost:11434

EMBEDDING_BINDING=ollama
EMBEDDING_MODEL=bge-m3:latest
EMBEDDING_DIM=1024
EMBEDDING_BINDING_HOST=http://localhost:11434
```

> ⚠️ **Lưu ý quan trọng với Ollama**: Context size phải >= 32k tokens
> ```bash
> # Tạo model với context size lớn hơn
> ollama show --modelfile qwen2.5:32b > Modelfile
> echo "PARAMETER num_ctx 32768" >> Modelfile
> ollama create -f Modelfile qwen2.5-32k
> ```

#### Sử Dụng Google Gemini:
```env
LLM_BINDING=gemini
LLM_MODEL=gemini-flash-latest
LLM_BINDING_API_KEY=your-gemini-api-key
LLM_BINDING_HOST=https://generativelanguage.googleapis.com

EMBEDDING_BINDING=gemini
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIM=1536
EMBEDDING_BINDING_API_KEY=your-gemini-api-key
EMBEDDING_BINDING_HOST=https://generativelanguage.googleapis.com
```

### Cấu Hình Server (Tùy Chọn)
```env
HOST=0.0.0.0
PORT=9621
WEBUI_TITLE='My Knowledge Base'
WEBUI_DESCRIPTION="LightRAG Knowledge Graph System"
```

---

## 🚀 Chạy Ứng Dụng

### Cách 1: Chạy Server Trực Tiếp
```bash
# Kích hoạt virtual environment
source .venv/bin/activate

# Chạy server
lightrag-server
```
**Truy cập**: http://localhost:9621

### Cách 2: Chạy Với Docker Compose
```bash
# Chỉnh sửa .env trước
docker compose up
```
**Truy cập**: http://localhost:9621

### Cách 3: Chạy Với Gunicorn (Production)
```bash
lightrag-gunicorn
```

---

## 🌐 Sử Dụng Web UI

Sau khi server chạy, mở trình duyệt và truy cập: `http://localhost:9621`

### 📁 Tab Documents (Tài Liệu)
1. **Upload tài liệu**: Hỗ trợ TXT, PDF, DOCX, PPTX, CSV
2. **Xem trạng thái xử lý**: Theo dõi tiến độ indexing
3. **Quản lý tài liệu**: Xóa, cập nhật

### 🔍 Tab Retrieval (Truy Vấn)

#### Query Mode (Chế độ truy vấn)

| Mode | Mô tả | Khi nào dùng |
|------|-------|--------------|
| **Naive** | Tìm kiếm vector truyền thống trên text chunks | Câu hỏi đơn giản, tìm kiếm từ khóa |
| **Local** | Tập trung vào **entity** (thực thể) trong Knowledge Graph | Hỏi về một đối tượng cụ thể |
| **Global** | Tập trung vào **relationships** (quan hệ) trong KG | Hỏi về mối liên hệ giữa các đối tượng |
| **Hybrid** | Local + Global | Câu hỏi phức tạp cần cả entity và relationship |
| **Mix** | Local + Global + Naive | **Khuyến nghị** - Kết hợp tất cả các phương pháp |
| **Bypass** | Bỏ qua retrieval, gửi thẳng câu hỏi tới LLM | Chat thường, không cần context từ tài liệu |

#### Response Format (Định dạng phản hồi)

| Format | Mô tả |
|--------|-------|
| **Multiple Paragraphs** | Câu trả lời dài, nhiều đoạn văn |
| **Single Paragraph** | Câu trả lời ngắn gọn, 1 đoạn |
| **Bullet Points** | Danh sách gạch đầu dòng |

#### Token Parameters (Giới hạn token)

| Parameter | Default | Mô tả |
|-----------|---------|-------|
| **KG Top K** | 40 | Số lượng entities/relations lấy từ Knowledge Graph. Áp dụng cho tất cả mode trừ Naive |
| **Chunk Top K** | 20 | Số lượng text chunks lấy từ vector search. Áp dụng cho **tất cả** modes |
| **Max Entity Tokens** | 6000 | Giới hạn tokens cho context về entities |
| **Max Relation Tokens** | 8000 | Giới hạn tokens cho context về relationships |
| **Max Total Tokens** | 30000 | Tổng budget tokens cho toàn bộ query context |

#### Advanced Options (Tùy chọn nâng cao)

| Option | Default | Mô tả |
|--------|---------|-------|
| **History Turns** | 0 | Số lượng cặp hội thoại (user-assistant) để giữ context. 0 = không giữ lịch sử |
| **Only Need Context** | Off | Bật = chỉ trả về context retrieved, không generate response |
| **Only Need Prompt** | Off | Bật = chỉ trả về prompt, không generate response |
| **Stream Response** | On | Bật = streaming real-time response |
| **Enable Rerank** | On | Bật = sắp xếp lại kết quả (cần cấu hình reranker model) |
| **Additional Output Prompt** | Empty | Prompt bổ sung cho LLM về cách format output |

#### Khuyến Nghị Cấu Hình

**Cho câu hỏi đơn giản:**
- Mode: `Naive` hoặc `Local`
- KG Top K: 20
- Chunk Top K: 10

**Cho câu hỏi phức tạp:**
- Mode: `Mix` (recommended)
- KG Top K: 40-60
- Chunk Top K: 20-30

**Cho summarization:**
- Mode: `Global`
- Response Format: Multiple Paragraphs
- Max Total Tokens: 50000+

### 🕸️ Tab Graph (Đồ Thị)
- Xem trực quan Knowledge Graph
- Điều hướng giữa các entities và relationships
- Zoom và pan để khám phá đồ thị

---

## 💻 Sử Dụng API

### Query API
```bash
curl -X POST http://localhost:9621/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Câu hỏi của bạn ở đây",
    "mode": "hybrid"
  }'
```

### Insert Document API
```bash
curl -X POST http://localhost:9621/documents/text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Nội dung tài liệu của bạn..."
  }'
```

### Upload File API
```bash
curl -X POST http://localhost:9621/documents/upload \
  -F "file=@/path/to/your/document.pdf"
```

---

## 🐍 Sử Dụng Với Python Code

```python
import asyncio
from lightrag import LightRAG, QueryParam
from lightrag.llm.openai import gpt_4o_mini_complete, openai_embed

WORKING_DIR = "./rag_storage"

async def main():
    # Khởi tạo LightRAG
    rag = LightRAG(
        working_dir=WORKING_DIR,
        embedding_func=openai_embed,
        llm_model_func=gpt_4o_mini_complete,
    )
    
    # BẮT BUỘC: Khởi tạo storage
    await rag.initialize_storages()
    
    try:
        # Thêm tài liệu
        await rag.ainsert("Nội dung tài liệu của bạn ở đây...")
        
        # Truy vấn
        result = await rag.aquery(
            "Câu hỏi của bạn?",
            param=QueryParam(mode="hybrid")
        )
        print(result)
        
    finally:
        # Đóng kết nối
        await rag.finalize_storages()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 📊 Lựa Chọn Model Phù Hợp

### LLM (Large Language Model)
| Loại | Model Khuyến Nghị | Ghi Chú |
|------|-------------------|---------|
| **Tốt nhất** | GPT-4o, Claude 3.5 | Chính xác cao, tốn chi phí |
| **Cân bằng** | GPT-4o-mini, Gemini Flash | Tốt cho hầu hết trường hợp |
| **Local** | Qwen2.5 32B, Llama 3.1 70B | Cần GPU mạnh |

### Embedding Model
| Model | Dimension | Ghi Chú |
|-------|-----------|---------|
| `text-embedding-3-large` | 3072 | Tốt nhất (OpenAI) |
| `BAAI/bge-m3` | 1024 | Đa ngôn ngữ, miễn phí |
| `jina-embeddings-v4` | 2048 | Đa ngôn ngữ |

### Reranker (Tùy Chọn)
Thêm vào `.env` để cải thiện kết quả:
```env
RERANK_BINDING=cohere
RERANK_MODEL=rerank-v3.5
RERANK_BINDING_API_KEY=your-cohere-api-key
```

---

## 🔧 Các Lệnh Hữu Ích

```bash
# Xem help của server
lightrag-server --help

# Xem options cho LLM binding cụ thể
lightrag-server --llm-binding openai --help
lightrag-server --llm-binding ollama --help

# Tải cache offline
lightrag-download-cache

# Dọn dẹp cache LLM query
lightrag-clean-llmqc
```

---

## 🐛 Xử Lý Lỗi Thường Gặp

### Lỗi 1: Connection refused với Ollama
**Nguyên nhân**: Ollama server chưa chạy
**Giải pháp**:
```bash
ollama serve
```

### Lỗi 2: Context length exceeded
**Nguyên nhân**: Context size của model quá nhỏ
**Giải pháp**: Thêm vào `.env`:
```env
OLLAMA_LLM_NUM_CTX=32768
```

### Lỗi 3: Embedding dimension mismatch
**Nguyên nhân**: Đổi embedding model sau khi đã index tài liệu
**Giải pháp**: Xóa thư mục `rag_storage` và index lại:
```bash
rm -rf ./rag_storage
# hoặc giữ cache LLM:
# giữ lại file kv_store_llm_response_cache.json
```

### Lỗi 4: Rate limit exceeded (OpenAI)
**Giải pháp**: Giảm concurrent requests trong `.env`:
```env
MAX_ASYNC=2
EMBEDDING_FUNC_MAX_ASYNC=4
```

---

## 📁 Cấu Trúc Thư Mục

```
pocHR-LightRAG/
├── .env                    # File cấu hình (tạo từ env.example)
├── .venv/                  # Virtual environment
├── lightrag/               # Source code chính
│   ├── api/                # REST API server
│   ├── kg/                 # Knowledge Graph storage
│   ├── llm/                # LLM integrations
│   └── ...
├── lightrag_webui/         # Frontend Web UI
├── examples/               # Ví dụ code
├── docs/                   # Tài liệu chi tiết
├── rag_storage/            # Dữ liệu knowledge graph (tự tạo)
└── inputs/                 # Thư mục upload tài liệu (tự tạo)
```

---

## 👥 HR CV Management Module

Module HR cho phép quản lý CV ứng viên, phân tích và matching với job description.

### Tính Năng

1. **Upload và Parse CV**: Hỗ trợ PDF, DOCX (sử dụng Microsoft MarkItDown)
2. **Extract thông tin**: LLM tự động trích xuất thông tin từ CV (Vietnamese/English)
3. **Interview Evaluation**: Đánh giá phỏng vấn senior (trọng số 2.5x)
4. **Skill Search**: Tìm kiếm ứng viên theo kỹ năng (hybrid: KG + vector)
5. **Job Matching**: AI matching ứng viên với job description

### Cấu Hình cho HR Module

Thêm vào file `.env`:

```env
# LLM cho HR (khuyến nghị Ollama local)
LLM_BINDING=ollama
LLM_MODEL=qwen2.5:7b
LLM_BINDING_HOST=http://localhost:11434
OLLAMA_LLM_NUM_CTX=32768

# Embedding (khuyến nghị local)
EMBEDDING_BINDING=ollama
EMBEDDING_MODEL=bge-m3:latest
EMBEDDING_DIM=1024
EMBEDDING_BINDING_HOST=http://localhost:11434

# HR Entity Types
ENTITY_TYPES='["Candidate", "Skill", "Company", "Education", "Certification", "JobPosition", "InterviewEvaluation", "Person", "Organization"]'

# Ngôn ngữ hỗ trợ
SUMMARY_LANGUAGE=Vietnamese,English
```

### Setup Ollama Models

```bash
# Pull embedding model
ollama pull bge-m3:latest

# Pull LLM model
ollama pull qwen2.5:7b
```

### Sử Dụng trong WebUI

1. **Truy cập tab "HR"** trong giao diện web
2. **Upload CV**: Click "Upload CV" và chọn file PDF/DOCX
3. **Xem chi tiết**: Click vào card ứng viên để xem thông tin đầy đủ
4. **Thêm đánh giá**: Trong tab Evaluations, click "Add Evaluation"
5. **Tìm kiếm**: Tab "Skill Search" để tìm ứng viên theo kỹ năng
6. **Job Matching**: Tab "Job Matcher" để matching với job description

### API Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/hr/candidates/upload` | POST | Upload CV (multipart/form-data) |
| `/hr/candidates` | GET | Danh sách ứng viên |
| `/hr/candidates/{id}` | GET | Chi tiết ứng viên |
| `/hr/candidates/{id}` | PUT | Cập nhật thông tin ứng viên |
| `/hr/candidates/{id}` | DELETE | Xóa ứng viên |
| `/hr/candidates/{id}/evaluation` | POST | Thêm đánh giá phỏng vấn |
| `/hr/candidates/{id}/skills` | POST | Thêm skills mới cho ứng viên |
| `/hr/skills/search?skill=Python` | GET | Tìm theo skill |
| `/hr/jobs/match` | POST | Match job description |
| `/hr/skills` | GET | Danh sách tất cả skills |

### Ví Dụ API

```bash
# Upload CV
curl -X POST "http://localhost:9621/hr/candidates/upload" \
  -H "Authorization: Bearer <token>" \
  -F "file=@cv.pdf"

# Tìm theo skill
curl "http://localhost:9621/hr/skills/search?skill=Python&top_k=10"

# Match job
curl -X POST "http://localhost:9621/hr/jobs/match" \
  -H "Content-Type: application/json" \
  -d '{
    "job_description": "Senior Python Developer với 5 năm kinh nghiệm...",
    "top_k": 15
  }'
```

### Trọng Số Đánh Giá

> **Quan trọng:** Đánh giá phỏng vấn từ senior có trọng số **2.5x** so với thông tin CV.
> Điều này đảm bảo đánh giá thực tế override các claims từ CV.

---

## 📖 Tài Liệu Tham Khảo

- [README chính thức](./README.md)
- [Docker Deployment](./docs/DockerDeployment.md)
- [Frontend Build Guide](./docs/FrontendBuildGuide.md)
- [Offline Deployment](./docs/OfflineDeployment.md)
- [Concurrent Explain](./docs/LightRAG_concurrent_explain.md)
- [GitHub Issues](https://github.com/HKUDS/LightRAG/issues)
- [Discord Community](https://discord.gg/yF2MmDJyGJ)

---

## 🎯 Tips Sử Dụng Hiệu Quả

1. **Chọn model phù hợp**: Với tài liệu tiếng Việt, sử dụng embedding model đa ngôn ngữ như `bge-m3`

2. **Chunking tối ưu**: Điều chỉnh trong `.env`:
   ```env
   CHUNK_SIZE=1200
   CHUNK_OVERLAP_SIZE=100
   ```

3. **Entity types cho tiếng Việt**:
   ```env
   ENTITY_TYPES='["Người", "Tổ Chức", "Địa Điểm", "Sự Kiện", "Khái Niệm"]'
   SUMMARY_LANGUAGE=Vietnamese
   ```

4. **Backup dữ liệu**: Thường xuyên backup thư mục `rag_storage/`

---

**Chúc bạn sử dụng LightRAG thành công! 🚀**
