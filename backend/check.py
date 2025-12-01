import socket

# 常见的梯子端口
ports = [7890, 7891, 7897, 1080, 10809]
print("🕵️ 正在侦探你的 Clash 端口...")

found = False
for port in ports:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        # 尝试连接 127.0.0.1
        result = s.connect_ex(('127.0.0.1', port))
        if result == 0:
            print(f"✅ 找到啦！！你的真实端口是: {port}")
            print(f"👉 请去 main.py 把 7890 改成 {port}")
            found = True
            break
        else:
            print(f"❌ 端口 {port} 不通")

if not found:
    print("😱 所有常用端口都不通！请检查 Clash 是否真的开启了？")