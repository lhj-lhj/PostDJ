// popup.js

let currentTracks = [];
let audioOutputs = [];

// Helper: promisify sendMessage and handle missing listeners
function sendMessage(tabId, msg) {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, msg, resp => {
      if (chrome.runtime.lastError) {
        console.warn(`[PostDJ] sendMessage to tab ${tabId} failed:`, chrome.runtime.lastError.message);
        return resolve(null);
      }
      resolve(resp);
    });
  });
}

async function initialize() {
  try {
    // 1. (Optional) prompt for mic permission so labels appear
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.warn('[PostDJ] mic permission denied, device labels may be blank');
    }

    // 2. enumerate all audio output devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    audioOutputs = devices
      .filter(d => d.kind === 'audiooutput')
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Output ${i + 1}`
      }));
    console.log('[PostDJ] audioOutputs =', audioOutputs);

    // 3. query all tabs in all windows
    const tabs = await new Promise(r => chrome.tabs.query({}, r));
    console.log('[PostDJ] all tabs =', tabs);

    // 4. fetch audioInfo from each tab
    const tabInfos = await Promise.all(
      tabs.map(tab =>
        sendMessage(tab.id, { type: 'getAudioInfo' })
          .then(resp => ({
            tabId: tab.id,
            title: tab.title,
            info: Array.isArray(resp?.audioInfo) ? resp.audioInfo : []
          }))
      )
    );

    // 5. flatten into single track list, attaching tabId & title
    currentTracks = tabInfos.flatMap(({ tabId, title, info }) =>
      info.map(track => ({
        ...track,
        tabId,
        title
      }))
    );
    console.log('[PostDJ] currentTracks =', currentTracks);

    // 6. render UI
    renderTrackList();

  } catch (err) {
    console.error('[PostDJ] init error', err);
    showError('Initialization failed');
  }
}

function renderTrackList() {
  const trackList = document.getElementById('track-list');
  trackList.innerHTML = '';

  currentTracks.forEach((track, idx) => {
    const div = document.createElement('div');
    div.className = 'track';
    div.dataset.index = track.index;
    div.dataset.tab = track.tabId;

    const optionsHtml = audioOutputs
      .map(d => `<option value="${d.deviceId}">${d.label}</option>`)
      .join('');

    div.innerHTML = `
      <h4>${track.title || 'Unknown'} — Track ${track.index + 1}</h4>
      <input
        type="range" min="0" max="1" step="0.01"
        class="volume-slider"
        data-index="${track.index}"
        data-tab="${track.tabId}"
        value="${track.volume}"
      >
      <span class="bpm">BPM: ${track.bpm ?? '—'}</span>
      <select
        class="sink-select"
        data-index="${track.index}"
        data-tab="${track.tabId}"
      >${optionsHtml}</select>
    `;

    trackList.appendChild(div);
  });

  setupEventListeners();
}

function setupEventListeners() {
  const trackList = document.getElementById('track-list');

  // Volume slider
  trackList.addEventListener('input', async e => {
    if (!e.target.matches('.volume-slider')) return;
    const idx = +e.target.dataset.index;
    const tab = +e.target.dataset.tab;
    const vol = +e.target.value;
    await sendMessage(tab, { type: 'setVolume', index: idx, volume: vol });
  });

  // Output device select
  trackList.addEventListener('change', async e => {
    if (!e.target.matches('.sink-select')) return;
    const idx = +e.target.dataset.index;
    const tab = +e.target.dataset.tab;
    const sinkId = e.target.value;
    await sendMessage(tab, { type: 'setSink', index: idx, sinkId });
  });
}

function showError(msg) {
  document.getElementById('track-list').innerHTML =
    `<div class="error">${msg}</div>`;
}

document.addEventListener('DOMContentLoaded', initialize);
