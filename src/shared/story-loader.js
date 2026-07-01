// 全局音频播放控制
window.__bgmUserPaused = false;
window.__bgmPlayed = false;

import config from '../stories/config.json';
import { initVinylPlayer } from './vinyl-player.js';
import { renderStory } from './story-renderer.js';

const params = new URLSearchParams(window.location.search);
const storyId = params.get('id');

if (!storyId) {
  window.location.href = './index.html';
  throw new Error('No story ID provided');
}

const storyConfig = config.stories.find(s => s.id === storyId);

if (!storyConfig) {
  console.error('Story not found:', storyId);
  window.location.href = './index.html';
  throw new Error(`Story not found: ${storyId}`);
}

// 动态加载 story data（Vite 的 import.meta.glob）
const dataModules = import.meta.glob('../stories/*/data.json');

async function loadStoryData() {
  const modulePath = `../stories/${storyId}/data.json`;
  const module = dataModules[modulePath];
  if (!module) {
    throw new Error(`Data file not found for story: ${storyId}`);
  }
  const data = await module();
  return data.default || data;
}

function renderBackgroundEffect(effect) {
  const container = document.getElementById('bgEffects');
  if (!container) return;
  container.innerHTML = '';

  // 基础噪点始终存在
  const baseNoise = document.createElement('div');
  baseNoise.className = 'bg-effect';
  container.appendChild(baseNoise);

  switch (effect) {
    case 'rain':
      container.innerHTML += '<div class="rain-overlay"></div>';
      break;
    case 'stars':
      container.innerHTML += '<div class="stars-overlay"></div><div class="scan-lines"></div>';
      break;
    case 'sunlight':
      container.innerHTML += '<div class="sunlight-overlay"></div><div class="leaf-overlay"></div>';
      break;
    case 'none':
    default:
      // 只保留基础噪点
      break;
  }
}

function setupChapterNavigation(data) {
  // 监听所有章节切换按钮的点击
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="chapter"]');
    if (!btn) return;
    
    const targetStoryId = btn.dataset.story;
    const targetIndex = parseInt(btn.dataset.index);
    
    if (targetStoryId !== storyId) {
      // 不是当前故事，让默认跳转处理
      return;
    }
    
    // 同一故事内翻页：阻止默认行为，无刷新切换
    e.preventDefault();
    
    // 更新 URL（不刷新页面）
    const url = new URL(window.location.href);
    url.searchParams.set('ch', targetIndex);
    history.pushState({ chapter: targetIndex }, '', url);
    
    // 重新渲染内容
    renderStory(data, storyId, targetIndex);
    
    // 检查章节 BGM 触点（翻页切换，快速响应）
    handleChapterBgm(data, targetIndex, false);
    
    // 预加载下一章 BGM（阅读时后台加载）
    preloadNextChapterBgm(data, targetIndex);
  });
  
  // 监听移动端下拉选择器
  document.addEventListener('change', (e) => {
    if (!e.target.matches('[data-action="chapter-select"]')) return;
    
    const targetStoryId = e.target.dataset.story;
    const targetIndex = parseInt(e.target.value);
    
    if (targetStoryId !== storyId) return;
    
    e.preventDefault();
    
    const url = new URL(window.location.href);
    url.searchParams.set('ch', targetIndex);
    history.pushState({ chapter: targetIndex }, '', url);
    
    renderStory(data, storyId, targetIndex);
    
    // 检查章节 BGM 触点（翻页切换，快速响应）
    handleChapterBgm(data, targetIndex, false);
    
    // 预加载下一章 BGM
    preloadNextChapterBgm(data, targetIndex);
  });
  
  // 浏览器后退/前进按钮支持
  window.addEventListener('popstate', (e) => {
    const newParams = new URLSearchParams(window.location.search);
    const newIndex = parseInt(newParams.get('ch')) || 0;
    renderStory(data, storyId, newIndex);
    
    // 检查章节 BGM 触点（翻页切换，快速响应）
    handleChapterBgm(data, newIndex, false);
    
    // 预加载下一章 BGM
    preloadNextChapterBgm(data, newIndex);
  });
}

// ===== BGM 预加载 & Crossfade 过渡 =====
// 预加载状态：url -> 'pending' | 'loaded' | 'error'
const __bgmPreloadState = {};

// 预加载单个 BGM，返回 Promise（加载完成或超时）
function preloadBgm(url, timeoutMs = 15000) {
  if (!url || __bgmPreloadState[url] === 'loaded') return Promise.resolve(true);
  if (__bgmPreloadState[url] === 'pending') return __bgmPreloadPromises[url];
  
  __bgmPreloadState[url] = 'pending';
  
  const p = new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
    
    let resolved = false;
    function done(ok) {
      if (resolved) return;
      resolved = true;
      __bgmPreloadState[url] = ok ? 'loaded' : 'error';
      resolve(ok);
    }
    
    audio.addEventListener('canplaythrough', () => done(true), { once: true });
    audio.addEventListener('error', () => done(false), { once: true });
    
    // 超时兜底
    setTimeout(() => done(false), timeoutMs);
  });
  
  // 缓存 Promise 避免重复加载
  if (!window.__bgmPreloadPromises) window.__bgmPreloadPromises = {};
  window.__bgmPreloadPromises[url] = p;
  return p;
}

// 优先加载当前章节 BGM，再加载其他（避免大文件同时下载争抢带宽）
function preloadStoryBgms(data, currentChapterIndex = 0) {
  const urls = [];
  if (storyConfig.bgm) urls.push(storyConfig.bgm);
  if (data.chapters) {
    data.chapters.forEach((ch, i) => {
      if (ch.bgm) urls.push(ch.bgm);
    });
  }
  // 去重
  const unique = [...new Set(urls)];
  
  // 获取当前章节的目标 BGM，排在最前面优先加载
  const currentChapter = data.chapters?.[currentChapterIndex];
  const currentBgm = currentChapter?.bgm || storyConfig.bgm;
  const priority = currentBgm ? [currentBgm] : [];
  const rest = unique.filter(u => u !== currentBgm);
  const ordered = [...priority, ...rest];
  
  // 逐个加载（串行，避免带宽争抢），当前优先
  ordered.forEach((url, i) => {
    setTimeout(() => preloadBgm(url), i === 0 ? 0 : 500);
  });
}

// 预加载下一章的 BGM（用户阅读时后台加载）
function preloadNextChapterBgm(data, currentIndex) {
  if (!data.chapters) return;
  const nextIndex = currentIndex + 1;
  const nextChapter = data.chapters[nextIndex];
  if (nextChapter?.bgm) {
    preloadBgm(nextChapter.bgm);
  }
}

// 显示/隐藏唱片加载状态
function setVinylLoading(isLoading) {
  const disc = document.getElementById('vinylDisc');
  if (!disc) return;
  if (isLoading) {
    disc.classList.add('loading');
  } else {
    disc.classList.remove('loading');
  }
}

// 显示/隐藏加载提示（页面中央）
function showBgmLoading(text) {
  let el = document.getElementById('bgmLoading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bgmLoading';
    el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;padding:12px 20px;background:rgba(0,0,0,0.75);color:#fff;border-radius:8px;font-size:14px;letter-spacing:1px;transition:opacity 0.3s;opacity:0;pointer-events:none;';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = '1';
}

function hideBgmLoading() {
  const el = document.getElementById('bgmLoading');
  if (el) el.style.opacity = '0';
}

// Crossfade 过渡：旧音乐淡出，新音乐淡入
// 核心修复：不使用 new Audio() 播放（避免浏览器限制），只用 bgm 元素
// newAudio 仅作为加载探测器，不播放音频
function crossfadeBgm(bgm, newSrc, duration = 1000) {
  setVinylLoading(true);
  showBgmLoading('🎵 音乐加载中...');
  
  const oldVolume = bgm.volume || 1;
  const wasPlaying = !bgm.paused;
  
  // 如果用户已暂停，直接切换
  if (!wasPlaying || window.__bgmUserPaused) {
    bgm.src = newSrc;
    bgm.load();
    bgm.volume = oldVolume;
    setVinylLoading(false);
    hideBgmLoading();
    return;
  }
  
  // 创建新音频对象仅用于检测加载状态（不播放）
  const newAudio = new Audio();
  newAudio.crossOrigin = 'anonymous';
  newAudio.src = newSrc;
  
  let state = 'loading'; // 'loading' | 'fading' | 'done'
  let animFrameId = null;
  
  function cleanup() {
    if (state === 'done') return;
    state = 'done';
    if (animFrameId) cancelAnimationFrame(animFrameId);
    setVinylLoading(false);
    hideBgmLoading();
  }
  
  // 加载完成，开始 crossfade
  // 旧音乐淡出 3秒，新音乐在 1.5秒后开始淡入，两者重叠 1.5秒
  function startCrossfade() {
    if (state !== 'loading') return;
    state = 'fading';
    
    hideBgmLoading();
    
    const startTime = performance.now();
    const FADE_OUT_MS = 3000;   // 旧音乐淡出 3秒
    const FADE_IN_DELAY = 1500; // 1.5秒后开始新音乐
    const FADE_IN_MS = 1500;    // 新音乐淡入 1.5秒
    
    let switchedToNew = false;
    let newAudioLoaded = false;
    
    function animate(now) {
      if (state === 'done') return;
      const elapsed = now - startTime;
      
      // 旧音乐淡出（3秒，ease-out）
      const fadeOutProgress = Math.min(elapsed / FADE_OUT_MS, 1);
      const easeOut = 1 - Math.pow(1 - fadeOutProgress, 2);
      const oldVol = Math.max(0, oldVolume * (1 - easeOut));
      
      // 在 1.5秒时切换到新音频
      if (!switchedToNew && elapsed >= FADE_IN_DELAY) {
        switchedToNew = true;
        // 切换到新音频
        bgm.pause();
        bgm.src = newSrc;
        bgm.load();
        bgm.volume = 0;
        bgm.play().then(() => {
          newAudioLoaded = true;
        }).catch(() => showToast());
      }
      
      // 如果新音乐已经启动，计算淡入音量
      if (switchedToNew && newAudioLoaded) {
        const fadeInElapsed = elapsed - FADE_IN_DELAY;
        const fadeInProgress = Math.min(fadeInElapsed / FADE_IN_MS, 1);
        const easeIn = fadeInProgress * fadeInProgress;
        const newVol = Math.min(oldVolume, easeIn);
        bgm.volume = newVol;
      } else if (!switchedToNew) {
        // 还没切换，继续播放旧音乐
        bgm.volume = oldVol;
      }
      
      if (fadeOutProgress < 1) {
        animFrameId = requestAnimationFrame(animate);
      } else {
        // 3秒完成，旧音乐淡出结束
        cleanup();
        window.__bgmPlayed = true;
        sessionStorage.setItem('bgm_playing', 'true');
      }
    }
    
    animFrameId = requestAnimationFrame(animate);
  }
  
  // 错误处理：直接切换
  newAudio.addEventListener('error', () => {
    if (state === 'done') return;
    cleanup();
    bgm.src = newSrc;
    bgm.load();
    bgm.volume = oldVolume;
    bgm.play().catch(() => showToast());
  }, { once: true });
  
  // 轮询加载状态（readyState >= 2 表示可以开始播放）
  let pollCount = 0;
  const poll = setInterval(() => {
    pollCount++;
    if (newAudio.readyState >= 2) {
      clearInterval(poll);
      startCrossfade();
      return;
    }
    // 8秒超时：即使没加载完也执行 crossfade（bgm.play() 会等待）
    if (pollCount > 80) {
      clearInterval(poll);
      if (state === 'loading') {
        startCrossfade();
      }
    }
  }, 100);
  
  // 开始加载
  newAudio.load();
}

// 章节 BGM 触点处理：切换章节时检查是否需要过渡音乐
// directEntry=true: 页面初始化直接进入某章（等待 BGM 加载完成）
// directEntry=false: 翻页切换（1.5s 超时，快速响应）
function handleChapterBgm(data, chapterIndex, directEntry = false) {
  const bgm = document.getElementById('bgm');
  if (!bgm) return;
  
  const chapter = data.chapters[chapterIndex];
  if (!chapter) return;
  
  // 章节 bgm 优先，否则用故事默认
  const targetBgm = chapter.bgm || storyConfig.bgm;
  if (!targetBgm) return;
  
  // 辅助函数：从 URL 提取文件名（解码中文）
  function getFileName(url) {
    try {
      return decodeURIComponent(url.split('/').pop().split('?')[0]);
    } catch {
      return url.split('/').pop().split('?')[0];
    }
  }
  
  // 如果当前已经在播放目标音乐，不做任何操作
  const currentFileName = getFileName(bgm.src || '');
  const targetFileName = getFileName(targetBgm);
  if (currentFileName === targetFileName) {
    return;
  }
  
  const wasPlaying = !bgm.paused;
  const userPaused = window.__bgmUserPaused;
  
  // 清除旧进度，从新章节开始
  sessionStorage.removeItem('bgm_time');
  sessionStorage.removeItem('bgm_playing');
  
  // 更新唱片标签
  const label = document.getElementById('vinylLabel');
  if (label) {
    label.textContent = chapter.bgmLabel || storyConfig.bgmLabel || storyConfig.title;
  }
  sessionStorage.setItem('bgm_src', targetBgm);
  
  // 如果用户已暂停，直接切换，不播放
  if (!wasPlaying || userPaused) {
    bgm.src = targetBgm;
    bgm.load();
    bgm.volume = 1;
    return;
  }
  
  // 正在播放中：使用 crossfade 过渡
  // 直接进入某章时等待加载，翻页切换时快速响应
  crossfadeBgm(bgm, targetBgm, 1000, directEntry);
}

// ===== 内联评论模块（避免 Vite 缓存问题）=====
const STORY_ISSUE_MAP = {
  'story1': 1,
  'story2': 2,
  'story3': 3,
};

function getCurrentStory() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function loadLocalComments(storyId) {
  try {
    const key = `narrative-comments-${storyId}`;
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    console.error('读取本地评论失败:', e);
    return [];
  }
}

function saveLocalComments(storyId, comments) {
  try {
    const key = `narrative-comments-${storyId}`;
    localStorage.setItem(key, JSON.stringify(comments));
  } catch (e) {
    console.error('保存本地评论失败:', e);
  }
}

async function loadGithubComments(storyId) {
  const issueNumber = STORY_ISSUE_MAP[storyId];
  if (!issueNumber) return [];
  try {
    const response = await fetch(
      `https://api.github.com/repos/CTRL66666/NARRATIVE/issues/${issueNumber}/comments`
    );
    if (!response.ok) return [];
    const comments = await response.json();
    return comments.map(c => {
      let body = c.body;
      let author = c.user?.login || '匿名';
      const match = body.match(/^([^:]+):\s*(.+)$/s);
      if (match) {
        author = match[1].trim();
        body = match[2].trim();
      }
      return {
        name: author,
        text: body,
        time: c.created_at,
        source: 'github',
      };
    });
  } catch (error) {
    console.error('加载 GitHub 评论失败:', error);
    return [];
  }
}

async function loadAllComments(storyId) {
  const local = loadLocalComments(storyId);
  const github = await loadGithubComments(storyId);
  const all = [...github, ...local];
  all.sort((a, b) => new Date(a.time) - new Date(b.time));
  return all;
}

function renderComments(comments, container) {
  if (!comments || comments.length === 0) {
    container.innerHTML = `
      <div class="comment-empty">
        <p>暂无评论，来做第一个留言的人吧～</p>
      </div>
    `;
    return;
  }

  const html = comments.map(comment => {
    const date = new Date(comment.time);
    const timeStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const sourceTag = comment.source === 'github' ? '' : '<span style="font-size:0.7rem;opacity:0.5;margin-left:4px;">(本地)</span>';
    
    return `
      <div class="comment-item">
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(comment.name)}${sourceTag}</span>
          <span class="comment-time">${timeStr}</span>
        </div>
        <div class="comment-body">${escapeHtml(comment.text)}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

async function submitComment(name, text) {
  const storyId = getCurrentStory();
  if (!storyId) return { success: false, error: '无法识别当前故事' };

  const comments = loadLocalComments(storyId);
  comments.push({
    name: name || '匿名读者',
    text: text,
    time: new Date().toISOString(),
    source: 'local',
  });

  saveLocalComments(storyId, comments);
  return { success: true };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function initComments() {
  const storyId = getCurrentStory();
  if (!storyId) {
    console.warn('无法识别当前故事，评论功能未初始化');
    return;
  }

  const container = document.getElementById('commentsContainer');
  if (container) {
    loadAllComments(storyId).then(comments => {
      renderComments(comments, container);
    });
  }

  const form = document.getElementById('commentForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('commentName');
    const textInput = document.getElementById('commentText');
    const submitBtn = form.querySelector('.comment-submit');

    const name = nameInput?.value.trim() || '';
    const text = textInput?.value.trim();

    if (!text) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';

    const result = await submitComment(name, text);

    if (result.success) {
      textInput.value = '';
      if (nameInput) nameInput.value = '';
      renderComments(await loadAllComments(storyId), container);
    } else {
      alert(`评论失败：${result.error}`);
    }

    submitBtn.disabled = false;
    submitBtn.textContent = '发表留言';
  });
}

// ===== 主初始化 =====
async function init() {
  const data = await loadStoryData();

  // 合并配置：config.json 的元数据优先
  data.title = storyConfig.title || data.title;
  data.author = storyConfig.author || data.author;
  data.tag = storyConfig.tag || data.tag;
  data.volume = storyConfig.volume || data.volume;
  data.bgm = storyConfig.bgm;
  data.bgmLabel = storyConfig.bgmLabel;
  data.backgroundEffect = storyConfig.backgroundEffect;
  data.nextStory = storyConfig.nextStory;
  data.nextStoryTitle = config.stories.find(s => s.id === storyConfig.nextStory)?.title;

  // 设置主题
  document.body.dataset.theme = storyConfig.theme;
  
  // 预加载故事所有 BGM（优先加载当前章节，解决切换时加载延迟问题）
  const initialChapter = parseInt(params.get('ch')) || 0;
  preloadStoryBgms(data, initialChapter);

  // 设置 BGM
  const bgm = document.getElementById('bgm');
  if (bgm && storyConfig.bgm) {
    const savedSrc = sessionStorage.getItem('bgm_src');
    const savedTime = parseFloat(sessionStorage.getItem('bgm_time') || '0');
    const wasPlaying = sessionStorage.getItem('bgm_playing') === 'true';
    const userPaused = window.__bgmUserPaused;
    const vinylDisc = document.getElementById('vinylDisc');

    // Toast 提示：自动播放失败时显示底部非阻塞提示
    function showToast() {
      if (window.__bgmToastShown || window.__bgmPlayed) return;
      window.__bgmToastShown = true;
      const toast = document.getElementById('bgmToast');
      if (toast) {
        toast.style.display = 'block';
        requestAnimationFrame(() => { toast.style.opacity = '1'; });
      }
      if (vinylDisc) vinylDisc.classList.add('hint-pulse');
    }
    function hideToast() {
      const toast = document.getElementById('bgmToast');
      if (toast) {
        toast.style.opacity = '0';
        setTimeout(() => { toast.style.display = 'none'; }, 300);
      }
      if (vinylDisc) vinylDisc.classList.remove('hint-pulse');
    }

    // Toast 点击：尝试播放
    const toast = document.getElementById('bgmToast');
    if (toast && !toast._onclickSet) {
      toast._onclickSet = true;
      toast.onclick = () => {
        hideToast();
        bgm.play().then(() => {
          window.__bgmPlayed = true;
          sessionStorage.setItem('bgm_playing', 'true');
        }).catch(() => showToast());
      };
    }

    // 设置音频源（story.html <head> 可能已经设置了）
    if (savedSrc === storyConfig.bgm) {
      // 同一故事内返回/刷新：恢复进度
      if (bgm.src !== storyConfig.bgm) {
        bgm.src = storyConfig.bgm;
        bgm.load();
      }
      // 恢复播放时间
      if (wasPlaying && !userPaused) {
        bgm.currentTime = savedTime;
        bgm.play().catch(() => showToast());
      }
    } else {
      // 换了故事：从头开始，清除旧进度
      sessionStorage.removeItem('bgm_time');
      sessionStorage.removeItem('bgm_playing');
      if (bgm.src !== storyConfig.bgm) {
        bgm.src = storyConfig.bgm;
        bgm.load();
      }
    }

    sessionStorage.setItem('bgm_src', storyConfig.bgm);

    // 尝试自动播放（仅用户未手动暂停时）
    if (!userPaused) {
      const tryPlay = () => {
        bgm.play().then(() => {
          window.__bgmPlayed = true;
          sessionStorage.setItem('bgm_playing', 'true');
          console.log('自动播放成功');
        }).catch(() => {
          console.log('自动播放被阻止');
          showToast();
        });
      };

      // 如果已加载，直接尝试播放
      if (bgm.readyState >= 3) {
        tryPlay();
      } else {
        // 轮询 readyState，加载好后自动播放
        let pollCount = 0;
        const poll = setInterval(() => {
          pollCount++;
          if (bgm.readyState >= 3) {
            clearInterval(poll);
            tryPlay();
            return;
          }
          // 3秒超时：直接弹窗
          if (pollCount > 30) {
            clearInterval(poll);
            if (!window.__bgmPlayed && !window.__bgmModalShown) {
              showToast();
            }
          }
        }, 100);
      }

      // 加载失败也显示弹窗
      bgm.addEventListener('error', () => {
        if (!window.__bgmPlayed && !window.__bgmModalShown) {
          showToast();
        }
      }, { once: true });
    }
  }

  // 设置唱片标签
  const label = document.getElementById('vinylLabel');
  if (label) label.textContent = storyConfig.bgmLabel || storyConfig.title;

  // 设置导航
  document.getElementById('storyTag').textContent = storyConfig.tag;
  document.getElementById('storyTitle').textContent = storyConfig.title;

  // 设置下一篇链接
  const nextLink = document.getElementById('nextLink');
  if (nextLink && storyConfig.nextStory) {
    nextLink.href = `./story.html?id=${storyConfig.nextStory}`;
  }

  // 渲染背景效果
  renderBackgroundEffect(storyConfig.backgroundEffect);

  // 渲染初始章节
  renderStory(data, storyId, initialChapter);
  
  // 检查初始章节的 BGM 触点（直接进入某章时等待加载完成）
  handleChapterBgm(data, initialChapter, true);
  
  // 预加载下一章 BGM
  preloadNextChapterBgm(data, initialChapter);
  
  // 设置章节导航（无刷新切换）
  setupChapterNavigation(data);

  // 初始化唱片播放器
  initVinylPlayer('vinylDisc', 'bgm');

  // 初始化评论
  initComments();
  
  // 注入版本号
  const versionMark = document.querySelector('.version-mark');
  if (versionMark) {
    versionMark.textContent = 'v1.0.33';
  }
}

init().catch(err => {
  console.error('Failed to load story:', err);
});
