import os
import shutil
import time
import json
import requests
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

# 1. 加载 Key
load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")

# 锁定模型
LOCKED_MODEL_NAME = "gemini-3-pro-preview"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 纯 Requests 上传函数
def upload_file_via_requests(file_path, mime_type="video/mp4"):
    file_size = os.path.getsize(file_path)
    display_name = os.path.basename(file_path)
    
    url = f"https://generativelanguage.googleapis.com/upload/v1beta/files?key={API_KEY}"
    
    init_headers = {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": str(file_size),
        "X-Goog-Upload-Header-Content-Type": mime_type,
        "Content-Type": "application/json"
    }
    body = {"file": {"display_name": display_name}}
    
    print(f"📡 [1/3] 连接 Google API...")
    # 云端直连，不需要代理设置
    response = requests.post(url, headers=init_headers, json=body)
    
    if response.status_code != 200:
        raise Exception(f"初始化失败: {response.text}")
        
    upload_url = response.headers.get("X-Goog-Upload-URL")
    
    print(f"🚀 [2/3] 传输数据...")
    upload_headers = {
        "Content-Length": str(file_size),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize"
    }
    
    with open(file_path, "rb") as f:
        upload_resp = requests.post(upload_url, headers=upload_headers, data=f)
            
    if upload_resp.status_code != 200:
        raise Exception(f"上传失败: {upload_resp.text}")
            
    return upload_resp.json()["file"]["uri"]

def wait_for_processing(file_uri):
    file_name = file_uri.split("/")[-1] 
    print(f"⏳ [2.5/3] 等待处理...")
    check_url = f"https://generativelanguage.googleapis.com/v1beta/files/{file_name}?key={API_KEY}"
    
    while True:
        resp = requests.get(check_url)
        state = resp.json().get("state")
        print(f"   -> 状态: {state}")
        
        if state == "ACTIVE":
            return
        elif state == "FAILED":
            raise Exception("Google 处理视频失败")
        
        time.sleep(2)

def generate_content(file_uri):
    print(f"🤖 [3/3] AI ({LOCKED_MODEL_NAME}) 分析中...")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{LOCKED_MODEL_NAME}:generateContent?key={API_KEY}"
    
    # --- 核心修改：加强中文指令 ---
    prompt_text = """
    Role: Senior Content Strategy Expert (Traffic Pulse Pro).
    Task: Analyze the media and generate a strategy JSON.
    
    【CRITICAL INSTRUCTION】
    ALL OUTPUT MUST BE IN SIMPLIFIED CHINESE (简体中文). 
    无论视频内容是什么语言，你必须用中文输出所有分析结果、标题和文案！
    
    【深度运营指导要求】：
    1. 核心逻辑：解释为什么要在这个平台这么发（例如：利用抖音的完播率机制，或小红书的搜索长尾机制）。
    2. 标签策略：不仅给标签，还要解释标签的组合逻辑（大词+精准词）。
    3. 投放/加热建议：具体到投给什么人群（性别/年龄/兴趣），在什么播放量级介入。
    
    Strict JSON Structure:
    {
      "visual_analysis": {
        "summary": "画面内容描述(中文)",
        "tags": ["视觉标签1", "视觉标签2"],
        "emotion": "情绪基调 (S/A/B)",
        "highlights": ["高光时刻1", "高光时刻2"]
      },
      "douyin": {
        "titles": ["悬念标题A", "反转标题B", "痛点标题C"],
        "hashtags": ["tag1", "tag2"],
        "timing_radar": {"best_time": "18:00", "reason": "下班高峰解压(中文)"},
        "ops_kit": {
            "core_logic": "一句话解释本视频在抖音的爆款逻辑",
            "tags_strategy": "解释标签打法",
            "dou_plus": "DOU+投放建议：人群包、投放目标、介入时机",
            "comment_script": ["神评论1", "神评论2"]
        }
      },
      "xiaohongshu": {
        "titles": ["Emoji标题A", "干货标题B"],
        "content": "正文内容(中文)...",
        "cover_design": {"layout": "3:4拼图", "text": "封面花字建议", "visual_elements": "视觉元素建议"},
        "timing_radar": {"best_time": "21:00", "reason": "睡前种草时刻(中文)"},
        "seo_keywords": ["词1", "词2"],
        "ops_kit": {
            "core_logic": "一句话解释在小红书的种草逻辑",
            "tags_strategy": "解释SEO标签埋点逻辑",
            "promotion": "加热建议（署条）：建议投放阅读量还是关注",
            "comment_script": ["互动引导话术1", "互动引导话术2"]
        }
      },
      "wechat": {
        "title": "稳重标题",
        "social_trigger": "适合转发到朋友圈的金句",
        "timing_radar": {"best_time": "12:00", "reason": "午休资讯阅读"},
        "ops_kit": {
            "core_logic": "一句话解释视频号的社交推荐逻辑",
            "tags_strategy": "解释话题标签的选择逻辑",
            "action_plan": "冷启动动作：转发至XX群，配文话术建议",
            "promotion": "微信豆投放建议",
            "comment_script": ["引导点赞话术"]
        }
      }
    }
    """
    
    body = {
        "contents": [{
            "parts": [
                {"text": prompt_text},
                {"file_data": {"mime_type": "video/mp4", "file_uri": file_uri}}
            ]
        }],
        "generationConfig": {"response_mime_type": "application/json"}
    }
    
    resp = requests.post(url, json=body, timeout=300)
    
    if resp.status_code != 200:
        raise Exception(f"AI 生成失败: {resp.text}")
        
    try:
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    except KeyError:
        raise Exception("AI 返回结果为空，可能被拦截。")

@app.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    if not os.path.exists("tmp"): os.makedirs("tmp")
    temp_path = f"tmp/{file.filename}"
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 简单判断类型 (图片/视频)
        mime = "image/jpeg" if file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')) else "video/mp4"
        
        # 1. 上传
        file_uri = upload_file_via_requests(temp_path, mime)
        
        # 2. 等待
        wait_for_processing(file_uri)
        
        # 3. 生成
        json_str = generate_content(file_uri)
        
        return json.loads(json_str)

    except Exception as e:
        print(f"❌ 发生错误: {str(e)}")
        return {"error": str(e)}
    finally:
        if os.path.exists(temp_path): os.remove(temp_path)

# --- 挂载前端页面 ---
current_dir = os.path.dirname(os.path.abspath(__file__))
dist_dir = os.path.join(current_dir, "dist")

if os.path.exists(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")
else:
    print(f"⚠️ 警告: 云端未找到 dist 文件夹。")
    @app.get("/")
    def read_root():
        return {"message": "后端运行正常，但 dist 文件夹未找到，请检查 GitHub 仓库"}