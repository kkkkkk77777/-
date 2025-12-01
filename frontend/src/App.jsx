import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  UploadCloud, Layout, Smartphone, Instagram, Monitor, 
  Clock, Hash, MessageCircle, Share2, Layers, Settings, 
  Copy, Check, ChevronRight, Trash2, Play, AlertCircle, Sparkles
} from 'lucide-react';
import './App.css';

const PLATFORMS = {
  douyin: { id: 'douyin', name: '抖音', icon: <Smartphone size={18}/>, color: '#000000', accent: '#22d3ee', uploadText: '上传短视频 (MP4/MOV)', accept: 'video/*' },
  xiaohongshu: { id: 'xiaohongshu', name: '小红书', icon: <Instagram size={18}/>, color: '#ff2442', accent: '#ff2442', uploadText: '上传图片或视频', accept: 'video/*,image/*' },
  wechat: { id: 'wechat', name: '视频号', icon: <Monitor size={18}/>, color: '#07c160', accent: '#07c160', uploadText: '上传横屏/竖屏视频', accept: 'video/*' }
};

function App() {
  const [currentView, setCurrentView] = useState('workspace'); 
  const [activeTab, setActiveTab] = useState('xiaohongshu');
  
  // 核心状态管理
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // 流程状态
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [result, setResult] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null); 

  const currentPlatform = PLATFORMS[activeTab];

  // 初始化历史记录
  useEffect(() => {
    const saved = localStorage.getItem('traffic_pulse_history');
    if (saved) setHistoryList(JSON.parse(saved));
  }, []);

  // 1. 仅选择文件，不上传
  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    // 重置所有状态
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setResult(null);
    setUploadProgress(0);
    setIsUploading(false);
    setIsAnalyzing(false);
    setCurrentView('workspace');
  };

  // 2. 点击按钮，开始上传并分析
  const startAnalysis = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // 发送请求 (带进度监听)
      const response = await axios.post('/analyze', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
          if (percentCompleted === 100) {
            setIsUploading(false);
            setIsAnalyzing(true); // 上传完，进入分析等待
          }
        }
      });

      const data = response.data;
      if (data.error) throw new Error(data.error);

      setResult(data);
      saveToHistory(data, file.name);
    } catch (err) {
      alert(`分析失败: ${err.message || "请检查后端是否启动"}`);
      console.error(err);
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  // 保存历史
  const saveToHistory = (analysisResult, fileName) => {
    const newItem = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      fileName: fileName,
      platform: activeTab,
      data: analysisResult
    };
    const updated = [newItem, ...historyList];
    setHistoryList(updated);
    localStorage.setItem('traffic_pulse_history', JSON.stringify(updated));
  };

  const deleteHistory = (e, id) => {
    e.stopPropagation();
    const updated = historyList.filter(item => item.id !== id);
    setHistoryList(updated);
    localStorage.setItem('traffic_pulse_history', JSON.stringify(updated));
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const restoreHistory = (item) => {
    setResult(item.data);
    setActiveTab(item.platform);
    setFile({ name: item.fileName }); 
    setPreviewUrl(null); 
    setCurrentView('workspace');
  };

  // --- 渲染策略面板 ---
  const renderStrategyPanel = () => {
    // 状态A: 正在分析中 (Loading 界面)
    if (isAnalyzing) return (
      <div className="scanning-effect" style={{color: currentPlatform.accent}}>
        <div className="scan-icon-wrapper">
           <Sparkles size={48} className="pulse-icon"/>
        </div>
        <h3>AI 大脑正在深度思考...</h3>
        <p>🧠 正在解析视频语义与情感...</p>
        <p>✍️ 正在根据{currentPlatform.name}算法撰写策略...</p>
        <div className="loading-bar"><div className="loading-fill" style={{background: currentPlatform.accent}}></div></div>
      </div>
    );

    // 状态B: 还没开始分析 (空状态)
    if (!result) return (
      <div className="empty-state">
        <div className="empty-icon" style={{color: currentPlatform.accent, opacity: 0.3}}>{currentPlatform.icon}</div>
        <p>请点击左侧 <strong>“开始智能分析”</strong> <br/>生成 {currentPlatform.name} 专属策略</p>
      </div>
    );

    // 状态C: 显示结果
    const data = result[activeTab];
    if (!data) return <div className="empty-state">无该平台数据</div>;

    return (
      <div className="strategy-content animate-in">
        {/* 文案工坊 */}
        <div className="module-card">
          <div className="module-title" style={{borderBottomColor: currentPlatform.accent}}>
            ✍️ 智能文案 (点击复制)
          </div>
          {data.titles && (
            <div className="titles-grid">
              {data.titles.map((t, i) => (
                <div key={i} className="title-option" onClick={() => handleCopy(t, `title-${i}`)}>
                  <div className="badge-row">
                    <span className="badge">备选 {String.fromCharCode(65+i)}</span>
                    {copiedIndex === `title-${i}` ? <Check size={14} color="#4ade80"/> : <Copy size={14} className="copy-icon"/>}
                  </div>
                  {t}
                </div>
              ))}
            </div>
          )}
          {data.title && (
            <div className="title-option main" onClick={() => handleCopy(data.title, 'main-title')}>
               <div className="badge-row">
                  <span className="badge">主标题</span>
                  {copiedIndex === 'main-title' ? <Check size={14} color="#4ade80"/> : <Copy size={14} className="copy-icon"/>}
               </div>
               {data.title}
            </div>
          )}
          {data.content && (
            <div className="content-box">
              <div className="content-actions">
                <button className="copy-btn" onClick={() => handleCopy(data.content, 'content')}>
                  {copiedIndex === 'content' ? <><Check size={14}/> 已复制</> : <><Copy size={14}/> 复制正文</>}
                </button>
              </div>
              {data.content}
            </div>
          )}
        </div>

        {/* 择时雷达 */}
        <div className="module-card radar-module">
          <div className="module-title" style={{borderBottomColor: currentPlatform.accent}}>📡 择时雷达</div>
          <div className="radar-display">
             <div className="radar-time" style={{color: currentPlatform.accent}}>{data.timing_radar.best_time}</div>
             <div className="radar-reason"><Clock size={16}/> {data.timing_radar.reason}</div>
          </div>
        </div>

        {/* 深度运营 SOP */}
        <div className="module-card sop-module">
          <div className="module-title" style={{borderBottomColor: currentPlatform.accent}}>🚀 深度运营 SOP</div>
          
          {data.ops_kit?.core_logic && (
            <div className="sop-section">
              <div className="sop-label">💡 核心爆款逻辑</div>
              <div className="sop-content highlight">{data.ops_kit.core_logic}</div>
            </div>
          )}
          
          {data.ops_kit?.tags_strategy && (
            <div className="sop-section">
              <div className="sop-label">🏷️ 标签打法</div>
              <div className="sop-content">{data.ops_kit.tags_strategy}</div>
            </div>
          )}

          {(data.ops_kit?.dou_plus || data.ops_kit?.promotion || data.ops_kit?.action_plan) && (
            <div className="sop-section">
              <div className="sop-label">🔥 投放与加热</div>
              <div className="sop-content">
                {activeTab === 'douyin' && data.ops_kit.dou_plus}
                {activeTab === 'xiaohongshu' && data.ops_kit.promotion}
                {activeTab === 'wechat' && data.ops_kit.action_plan}
              </div>
            </div>
          )}

          {data.ops_kit?.comment_script && (
            <div className="sop-section">
              <div className="sop-label">💬 评论预埋</div>
              <ul className="sop-list">
                {data.ops_kit.comment_script.map((s,i)=><li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHistoryView = () => (
    <div className="history-view animate-in">
      <div className="view-header">
        <h2><Clock size={24}/> 历史生成记录</h2>
        <button className="back-btn" onClick={() => setCurrentView('workspace')}>返回工作台</button>
      </div>
      {historyList.length === 0 ? (
        <div className="empty-history">暂无记录</div>
      ) : (
        <div className="history-list">
          {historyList.map(item => (
            <div key={item.id} className="history-item" onClick={() => restoreHistory(item)}>
              <div className="h-icon" style={{color: PLATFORMS[item.platform].color}}>{PLATFORMS[item.platform].icon}</div>
              <div className="h-info">
                <div className="h-title">{item.fileName}</div>
                <div className="h-date">{item.date} · {PLATFORMS[item.platform].name}</div>
              </div>
              <button className="delete-btn" onClick={(e) => deleteHistory(e, item.id)}><Trash2 size={16}/></button>
              <ChevronRight size={16} className="arrow"/>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="app-container">
      {/* 1. Sidebar */}
      <div className="sidebar">
        <div className="logo">Traffic Pulse Pro</div>
        <div className="nav-group">
          <div className="nav-label">核心功能</div>
          <button className={`nav-btn ${currentView==='workspace'?'active':''}`} onClick={()=>setCurrentView('workspace')}><Layers size={18}/> 工作台</button>
          <button className={`nav-btn ${currentView==='history'?'active':''}`} onClick={()=>setCurrentView('history')}><Clock size={18}/> 历史记录</button>
        </div>
        {currentView === 'workspace' && (
          <div className="nav-group">
            <div className="nav-label">目标平台</div>
            {Object.values(PLATFORMS).map(p => (
              <button 
                key={p.id}
                className={`nav-btn sub ${activeTab === p.id ? 'active-platform' : ''}`}
                onClick={() => setActiveTab(p.id)}
                style={activeTab === p.id ? {background: p.color, borderColor: p.accent} : {}}
              >
                {p.icon} {p.name}
              </button>
            ))}
          </div>
        )}
        <div className="spacer"></div>
        <div className="menu-item"><Settings size={20}/> 设置</div>
      </div>

      {/* 2. Content Area */}
      {currentView === 'history' ? (
        <div className="main-area full-width">{renderHistoryView()}</div>
      ) : (
        <>
          {/* 中间：预览与操作区 */}
          <div className="preview-area">
            <div className="preview-header">
               <span className="file-name">{file ? file.name : "请上传素材"}</span>
               {file && <span className="file-size">{file.type}</span>}
            </div>
            
            {/* 播放器容器：不再是黑洞，而是预览窗口 */}
            <div className="player-wrapper">
              {!file ? (
                <div className="upload-black-hole">
                   <input type="file" onChange={handleFileSelect} accept={currentPlatform.accept} />
                   <div className="hole-animation" style={{color: currentPlatform.accent}}><UploadCloud size={48} /></div>
                   <p className="hole-title" style={{color: currentPlatform.accent}}>{currentPlatform.uploadText}</p>
                   <p className="hole-sub">点击或拖拽文件至此</p>
                </div>
              ) : (
                <div className="media-container">
                  {/* 核心修改：object-fit contain 解决裁剪问题 */}
                  {previewUrl ? (
                    file.type?.startsWith('video') ? 
                      <video src={previewUrl} controls className="main-media" /> : 
                      <img src={previewUrl} className="main-media" />
                  ) : (
                    <div className="no-preview"><Layout size={48}/><p>历史记录模式不可预览</p></div>
                  )}
                  
                  {/* 替换按钮 */}
                  <div className="reupload-btn">
                    <input type="file" onChange={handleFileSelect} accept={currentPlatform.accept} />
                    <Layout size={14}/> 替换
                  </div>
                </div>
              )}
            </div>

            {/* 操作控制台 */}
            {file && (
              <div className="control-panel">
                {!isUploading && !isAnalyzing && !result && (
                  <button className="analyze-btn" onClick={startAnalysis} style={{background: currentPlatform.accent}}>
                    <Sparkles size={20}/> 开始智能分析
                  </button>
                )}

                {/* 上传进度条 */}
                {isUploading && (
                  <div className="progress-container">
                    <div className="progress-info">
                      <span>正在上传素材...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-bar" style={{width: `${uploadProgress}%`, background: currentPlatform.accent}}></div>
                    </div>
                  </div>
                )}

                {/* 结果摘要 */}
                {result && (
                   <div className="vision-report" style={{borderLeftColor: currentPlatform.accent}}>
                      <h4><Check size={16}/> 分析完成</h4>
                      <div className="tag-cloud">
                         {result.visual_analysis.tags.map(t => <span key={t}>#{t}</span>)}
                      </div>
                      <p>{result.visual_analysis.summary}</p>
                   </div>
                )}
              </div>
            )}
          </div>

          {/* 右侧：策略面板 */}
          <div className="strategy-panel">
            <div className="panel-header">AI 策略生成结果</div>
            <div className="panel-body">{renderStrategyPanel()}</div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;