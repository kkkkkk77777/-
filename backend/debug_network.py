import os
import requests

# 模拟后端的代理设置
os.environ["http_proxy"] = "http://127.0.0.1:7890"
os.environ["https_proxy"] = "http://127.0.0.1:7890"

print("🔍 正在尝试通过代理访问 Google API...")

try:
    # 尝试访问 Google 的一个核心地址
    resp = requests.get("https://generativelanguage.googleapis.com", timeout=10)
    print(f"✅ 成功连接！状态码: {resp.status_code}")
    print("🚀 这说明 Python -> Clash -> Google 的通路完全打通了！")
    print("👉 现在去启动 uvicorn 肯定没问题！")
except Exception as e:
    print(f"❌ 连接失败: {e}")
    print("💡 建议：")
    print("1. 确保 Clash 选了 'Global' (全局) 模式")
    print("2. 换一个 Clash 节点试试")