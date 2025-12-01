import os
import shutil
import time
import json
import requests
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# 1. 加载 Key
load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")

# ================= 核心网络配置 =================
# 必须使用 127.0.0.1 (IPv4)
#PROXY_URL = "http://127.0.0.1:7890"

# 强制 Python 所有流量走代理
#os.environ["http_proxy"] = PROXY_URL
#os.environ["https_proxy"] = PROXY_URL
# ===============================================

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
    
    # --- 第1步：初始化上传 ---
    url = f"https://generativelanguage.googleapis.com/upload/v1beta/files?key={API_KEY}"
    
    init_headers = {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": str(file_size),
        "X-Goog-Upload-Header-Content-Type": mime_type,
        "Content-Type": "application/json"
    }
    body = {"file": {"display_name": display_name}}
    
    print(f"📡 [1/3] 正在连接 Google API...")
    try:
        response = requests.post(url, headers=init_headers, json=body, timeout=30)
        if response.status_code != 200:
            raise Exception(f"初始化被拒绝: {response.text}")
    except Exception as e:
        raise Exception(f"网络连接失败: {e}")
        
    upload_url = response.headers.get("X-Goog-Upload-URL")
    
    # --- 第2步：上传实际数据 ---
    print(f"🚀 [2/3] 正在传输数据...")
    
    upload_headers = {
        "Content-Length": str(file_size),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize"
    }
    
    try:
        with open(file_path, "rb") as f:
            upload_resp = requests.post(
                upload_url, 
                headers=upload_headers, 
                data=f,
                timeout=300 # 上传超时
            )
            
        if upload_resp.status_code != 200:
            raise Exception(f"上传数据失败: {upload_resp.text}")
            
        file_info = upload_resp.json()
        file_uri = file_info["file"]["uri"]
        print(f"✅ 上传成功! File URI: {file_uri}")
        return file_uri
        
    except Exception as e:
        raise Exception(f"传输中断: {e}")

# 等待视频处理
def wait_for_processing(file_uri):
    file_name = file_uri.split("/")[-1] 
    print(f"⏳ [2.5/3] 等待 Google 处理视频...")
    
    check_url = f"https://generativelanguage.googleapis.com/v1beta/files/{file_name}?key={API_KEY}"
    
    while True:
        resp = requests.get(check_url, timeout=10)
        state = resp.json().get("state")
        print(f"   -> 状态: {state}")
        
        if state == "ACTIVE":
            return
        elif state == "FAILED":
            raise Exception("Google 处理视频失败")
        
        time.sleep(2)

# 生成内容 (含最新的 SOP Prompt)
def generate_content(file_uri):
    print(f"🤖 [3/3] AI ({LOCKED_MODEL_NAME}) 正在深度分析策略...")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{LOCKED_MODEL_NAME}:generateContent?key={API_KEY}"
    
    # 这里是升级后的 Prompt
    prompt_text = """
    你是一个资深全平台内容运营专家。请分析上传的素材（视频或图片），输出一份符合 Traffic Pulse Pro 标准的 JSON 策略报告。
    
    【重要】针对不同平台，你必须提供深度的运营指导：
    1. 核心逻辑：解释为什么要在这个平台这么发（例如：利用抖音的完播率机制，或小红书的搜索长尾机制）。
    2. 标签策略：不仅给标签，还要解释标签的组合逻辑（大词+精准词）。
    3. 投放/加热建议：具体到投给什么人群（性别/年龄/兴趣），在什么播放量级介入。
    
    严格的 JSON 输出结构如下：
    {
      "visual_analysis": {
        "summary": "画面内容描述",
        "tags": ["视觉标签1", "视觉标签2"],
        "emotion": "情绪基调 (S/A/B)",
        "highlights": ["高光时刻1", "高光时刻2"]
      },
      "douyin": {
        "titles": ["悬念标题A", "反转标题B", "痛点标题C"],
        "hashtags": ["tag1", "tag2"],
        "timing_radar": {"best_time": "18:00", "reason": "下班高峰解压"},
        "ops_kit": {
            "core_logic": "一句话解释本视频在抖音的爆款逻辑（例如：前3秒黄金矛盾点）",
            "tags_strategy": "解释标签打法（例如：泛娱乐标签拉流量+垂直标签找人群）",
            "dou_plus": "DOU+投放建议：人群包（如：30岁+男性，汽车兴趣）、投放目标（点赞或转化）、介入时机（如：自然播放过500后）",
            "comment_script": ["神评论1", "神评论2"]
        }
      },
      "xiaohongshu": {
        "titles": ["Emoji标题A", "干货标题B"],
        "content": "正文内容...",
        "cover_design": {"layout": "3:4拼图", "text": "封面花字建议", "visual_elements": "视觉元素建议"},
        "timing_radar": {"best_time": "21:00", "reason": "睡前种草时刻"},
        "seo_keywords": ["词1", "词2"],
        "ops_kit": {
            "core_logic": "一句话解释在小红书的种草逻辑（例如：强调利他性，提供情绪价值）",
            "tags_strategy": "解释SEO标签埋点逻辑",
            "promotion": "加热建议（署条）：建议投放‘阅读量’还是‘粉丝关注’，针对什么兴趣标签投放",
            "comment_script": ["互动引导话术1", "互动引导话术2"]
        }
      },
      "wechat": {
        "title": "稳重标题",
        "social_trigger": "适合转发到朋友圈的金句",
        "timing_radar": {"best_time": "12:00", "reason": "午休资讯阅读"},
        "ops_kit": {
            "core_logic": "一句话解释视频号的社交推荐逻辑（例如：利用家庭责任感引发转发）",
            "tags_strategy": "解释话题标签的选择逻辑",
            "action_plan": "冷启动动作：转发至XX群（如业主群/家族群），配文话术建议",
            "promotion": "微信豆投放建议：是否需要投，投给什么年龄段",
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
        # 保存本地
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 1. 上传
        file_uri = upload_file_via_requests(temp_path)
        
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
        # ... (上面的代码保持不变) ...

# --- 终极修复：挂载前端页面 (使用绝对路径) ---
# 1. 获取 main.py 文件所在的绝对路径
current_dir = os.path.dirname(os.path.abspath(__file__))

# 2. 拼接出 dist 的完整路径
dist_dir = os.path.join(current_dir, "dist")

# 3. 挂载
if os.path.exists(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")
else:
    # 如果还是找不到，为了防止报错，我们定义一个临时的根路由提示信息
    print(f"⚠️ 警告: 云端未找到 dist 文件夹。寻找路径: {dist_dir}")
    @app.get("/")
    def read_root():
        return {"message": "后端运行正常，但 dist 文件夹未找到，请检查 GitHub 仓库是否包含 backend/dist"}