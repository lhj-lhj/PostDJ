// content.js

// 1) 调试日志，确认脚本注入
console.log('[PostDJ] content script loaded, readyState=', document.readyState);

// 2) 单一 AudioContext 和全局 track 列表
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioTracks  = [];

// 3) 扫描并初始化一个 <audio> 或 <video> 元素
function initializeAudioTrack(el) {
  if (el.__postdj_inited) return;
  el.__postdj_inited = true;

  try {
    const source   = audioContext.createMediaElementSource(el);
    const gainNode = audioContext.createGain();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    source.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioContext.destination);

    const track = { el, source, gainNode, analyser, bpm: null };
    audioTracks.push(track);

    // 开始简单自相关 BPM 检测
    setInterval(() => {
      const buf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buf);
      track.bpm = detectBPM(buf, audioContext.sampleRate);
    }, 1000);

    console.log('[PostDJ] initialized track for', el.src || el.currentSrc, '→ index', audioTracks.length - 1);
  } catch (err) {
    console.error('[PostDJ] track init error:', err);
  }
}

// 4) 扫描页面上所有已存在的媒体
function initExistingTracks() {
  const els = document.querySelectorAll('audio, video');
  els.forEach(initializeAudioTrack);
}

// 5) 在安全时机启动初始化和观察器
function setupTrackObserver() {
  console.log('[PostDJ] setting up track observer');
  // 先处理现有
  initExistingTracks();
  // 再观察整个文档树，保证后续新增也能捕获
  const observer = new MutationObserver(initExistingTracks);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

// 6) 根据 readyState 决定何时 setup
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupTrackObserver);
} else {
  setupTrackObserver();
}

// 7) 自相关 BPM 检测函数（30–200 BPM）
function detectBPM(buf, sampleRate) {
  // 静音门限
  const rms = Math.sqrt(buf.reduce((sum, v) => sum + v*v, 0) / buf.length);
  if (rms < 0.01) return null;

  let bestOff = -1, bestCorr = 0;
  const minOff = Math.floor(sampleRate * 60 / 200);
  const maxOff = Math.floor(sampleRate * 60 /  30);

  for (let off = minOff; off <= maxOff; off++) {
    let corr = 0;
    for (let i = 0; i + off < buf.length; i++) {
      corr += buf[i] * buf[i + off];
    }
    corr /= (buf.length - off);
    if (corr > bestCorr) { bestCorr = corr; bestOff = off; }
  }
  if (bestOff < 0) return null;
  return Math.round(sampleRate * 60 / bestOff);
}

// 8) 消息监听
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'getAudioInfo') {
    const info = audioTracks.map((t, i) => ({
        index: i,
        volume: t.gainNode.gain.value,
        bpm: t.bpm || null
    }));
    sendResponse({ audioInfo: info });
    return true;
    }

    if (msg.type === 'setVolume') {
    const t = audioTracks[msg.index];
    if (t) t.gainNode.gain.value = msg.volume;
    }
    if (msg.type === 'setSink') {
    const t = audioTracks[msg.index];
    if (t && typeof t.el.setSinkId === 'function') {
        t.el.setSinkId(msg.sinkId).catch(console.error);
    }
    }
});
