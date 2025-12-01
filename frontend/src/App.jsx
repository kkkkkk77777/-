import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  UploadCloud, Layout, Smartphone, Instagram, Monitor, 
  Clock, Hash, MessageCircle, Share2, Layers, Search, Settings, 
  Copy, Check, ChevronRight, Trash2
} from 'lucide-react';
import './App.css';

const PLATFORMS = {
  douyin: { id: 'douyin', name: '抖音', icon: <Smartphone size={18}/>, color: '#000000', accent: '#22d3ee', uploadText: '上传短视频 (MP4/MOV)', accept: 'video/*' },
  xiaohongshu: { id: 'xiaohongshu', name: '小红书', icon: <Instagram size={18}/>, color: '#ff2442', accent: '#ff2442', uploadText: '上传图片或视频', accept: 'video/*,image/*' },
  wechat: { id: 'wechat', name: '视频号', icon: <Monitor size={18}/>, color: '#07c160', accent: '#07c160', uploadText: '上传横屏/竖屏视频', accept: 'video/*' }
};

function App() {
  const [currentView, setCurrentView] = useState('workspace'); // workspace | history
  const [activeTab, setActiveTab] = useState('xiaohongshu');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null); 

  // 初始化加载历史记录
  useEffect(() => {
    const saved = localStorage.getItem('traffic_pulse_history');
    if (saved) setHistoryList(JSON.parse(saved));
  }, []);

  // 保存历史记录
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

  // 删除历史
  const deleteHistory = (e, id) => {
    e.stopPropagation();
    const updated = historyList.filter(item => item.id !== id);
    setHistoryList(updated);
    localStorage.setItem('traffic_pulse_history', JSON.stringify(updated));
  };

  // 复制功能
  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleUpload = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setLoading(true);
    setResult(null);
    setCurrentView('workspace');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('analyze', formData);
      const data = response.data;
      setResult(data);
      saveToHistory(data, selectedFile.name); 
    } catch (err) {
      alert("分析失败，请检查后端！");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 恢复历史记录
  const restoreHistory = (item) => {
    setResult(item.data);
    setActiveTab(item.platform);
    setFile({ name: item.fileName }); 
    setPreviewUrl(null); 
    setCurrentView('workspace');
  };

  const currentPlatform = PLATFORMS[activeTab];

  // --- 渲染策略面板 (核心逻辑) ---
  const renderStrategyPanel = () => {
    if (loading) return (
      <div className="scanning-effect" style={{color: currentPlatform.accent}}>
        <div className="scan-line" style={{background: currentPlatform.accent, boxShadow: `0 0 10px ${currentPlatform.accent}`}}></div>
        <p>🧠 AI 大脑正在疯狂运转...</p>
        <p>👁️ 识别画面细节与情绪...</p>
        <p>🚀 正在生成{currentPlatform.name}深度策略...</p>
      </div>
    );

    if (!result) return (
      <div className="empty-state">
        <div className="empty-icon" style={{color: currentPlatform.accent, opacity: 0.5}}>{currentPlatform.icon}</div>
        <p>请在左侧上传素材<br/>生成 <strong>{currentPlatform.name}</strong> 策略</p>
      </div>
    );

    const data = result[activeTab];
    if (!data) return <div className="empty-state">无该平台数据</div>;

    return (
      <div className="strategy-content animate-in">
        {/* 1. 文案工坊 */}
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

        {/* 2. 视觉/封面工坊 (仅小红书) */}
        {activeTab === 'xiaohongshu' && data.cover_design && (
          <div className="module-card visual-engine">
            <div className="module-title" style={{borderBottomColor: currentPlatform.accent}}>
              🎨 封面工坊
            </div>
            <div className="cover-mockup">
               <div className="cover-text">{data.cover_design.text}</div>
            </div>
            <div className="cover-info">
               <p>📐 布局: {data.cover_design.layout}</p>
               <p>💡 建议: {data.cover_design.visual_elements}</p>
            </div>
          </div>
        )}

        {/* 3. 择时雷达 */}
        <div className="module-card radar-module">
          <div className="module-title" style={{borderBottomColor: currentPlatform.accent}}>📡 择时雷达</div>
          <div className="radar-display">
             <div className="radar-time" style={{color: currentPlatform.accent}}>{data.timing_radar.best_time}</div>
             <div className="radar-reason"><Clock size={16}/> {data.timing_radar.reason}</div>
          </div>
        </div>

        {/* 4. 深度运营 SOP (最新升级) */}
        <div className="module-card sop-module">
          <div className="module-title" style={{borderBottomColor: currentPlatform.accent}}>
            🚀 深度运营 SOP
          </div>
          
          {/* 核心爆款逻辑 */}
          {data.ops_kit?.core_logic && (
            <div className="sop-section">
              <div className="sop-label">💡 核心爆款逻辑</div>
              <div className="sop-content highlight">{data.ops_kit.core_logic}</div>
            </div>
          )}

          {/* 标签策略分析 */}
          {data.ops_kit?.tags_strategy && (
            <div className="sop-section">
              <div className="sop-label">🏷️ 标签打法分析</div>
              <div className="sop-content">{data.ops_kit.tags_strategy}</div>
            </div>
          )}

          {/* 投放/加热建议 */}
          {(data.ops_kit?.dou_plus || data.ops_kit?.promotion || data.ops_kit?.action_plan) && (
            <div className="sop-section">
              <div className="sop-label">🔥 投放与加热策略</div>
              <div className="sop-content">
                {activeTab === 'douyin' && data.ops_kit.dou_plus}
                {activeTab === 'xiaohongshu' && data.ops_kit.promotion}
                {activeTab === 'wechat' && (
                  <>
                    <div>{data.ops_kit.action_plan}</div>
                    <div style={{marginTop:'8px', opacity:0.8}}>{data.ops_kit.promotion}</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 评论区剧本 */}
          {data.ops_kit?.comment_script && (
            <div className="sop-section">
              <div className="sop-label">💬 评论区预埋</div>
              <ul className="sop-list">
                {data.ops_kit.comment_script.map((s,i)=><li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- 渲染历史记录页面 ---
  const renderHistoryView = () => (
    <div className="history-view animate-in">
      <div className="view-header">
        <h2><Clock size={24}/> 历史生成记录</h2>
        <button className="back-btn" onClick={() => setCurrentView('workspace')}>返回工作台</button>
      </div>
      
      {historyList.length === 0 ? (
        <div className="empty-history">暂无记录，快去生成第一条爆款吧！</div>
      ) : (
        <div className="history-list">
          {historyList.map(item => (
            <div key={item.id} className="history-item" onClick={() => restoreHistory(item)}>
              <div className="h-icon" style={{color: PLATFORMS[item.platform].color}}>
                {PLATFORMS[item.platform].icon}
              </div>
              <div className="h-info">
                <div className="h-title">{item.fileName}</div>
                <div className="h-date">{item.date} · {PLATFORMS[item.platform].name}策略</div>
              </div>
              <button className="delete-btn" onClick={(e) => deleteHistory(e, item.id)}>
                <Trash2 size={16}/>
              </button>
              <ChevronRight size={16} className="arrow"/>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo">Traffic Pulse Pro</div>
        
        <div className="nav-group">
          <div className="nav-label">核心功能</div>
          <button className={`nav-btn ${currentView==='workspace'?'active':''}`} onClick={()=>setCurrentView('workspace')}>
            <Layers size={18}/> 工作台
          </button>
          <button className={`nav-btn ${currentView==='history'?'active':''}`} onClick={()=>setCurrentView('history')}>
            <Clock size={18}/> 历史记录
          </button>
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

      {/* Main Content */}
      {currentView === 'history' ? (
        <div className="main-area full-width">
          {renderHistoryView()}
        </div>
      ) : (
        <>
          <div className="preview-area">
            <div className="preview-header">
               <span>{file ? file.name : "准备就绪"}</span>
               <span className="status-dot" style={{color: currentPlatform.accent}}>
                 {result ? "● 分析完成" : "○ 等待素材"}
               </span>
            </div>
            
            <div className="player-wrapper" style={{borderColor: loading ? currentPlatform.accent : '#334155'}}>
              {!file ? (
                <div className="upload-black-hole">
                   <input type="file" onChange={handleUpload} accept={currentPlatform.accept} />
                   <div className="hole-animation" style={{color: currentPlatform.accent}}>
                      <UploadCloud size={48} />
                   </div>
                   <p className="hole-title" style={{color: currentPlatform.accent}}>{currentPlatform.uploadText}</p>
                   <p className="hole-sub">点击或拖拽文件至此</p>
                </div>
              ) : (
                <div className="media-container">
                  {previewUrl ? (
                    file.type?.startsWith('video') ? 
                      <video src={previewUrl} controls className="main-media" /> : 
                      <img src={previewUrl} className="main-media" />
                  ) : (
                    <div className="no-preview">
                      <Layout size={48} color="#475569"/>
                      <p>历史记录模式暂不支持预览原文件</p>
                    </div>
                  )}
                  <div className="reupload-btn">
                    <input type="file" onChange={handleUpload} accept={currentPlatform.accept} />
                    <Layout size={14}/> 替换素材
                  </div>
                </div>
              )}
            </div>
            {/* 视觉报告摘要 */}
            {result && (
               <div className="vision-report" style={{borderLeftColor: currentPlatform.accent}}>
                  <h4>👁️ AI 视觉诊断报告</h4>
                  <div className="tag-cloud">
                     {result.visual_analysis.tags.map(t => <span key={t}>#{t}</span>)}
                     <span className="score" style={{background: currentPlatform.accent}}>
                       {result.visual_analysis.emotion}
                     </span>
                  </div>
                  <p>{result.visual_analysis.summary}</p>
               </div>
            )}
          </div>

          <div className="strategy-panel">
            <div className="panel-header">策略结果</div>
            <div className="panel-body">
               {renderStrategyPanel()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;