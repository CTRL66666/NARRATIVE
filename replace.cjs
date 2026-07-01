const fs = require('fs');
let content = fs.readFileSync('src/shared/story-loader.js', 'utf8');

const oldFunc = `// Crossfade 过渡：旧音乐淡出 duration 毫秒，新音乐同时淡入
// 核心优化：新音频没准备好之前，旧音乐继续正常播放，不会静默
// waitForLoad=true: 等待新音频 canplay 再开始（用于直接进入某章）
// waitForLoad=false: 新音频 canplay 后自动开始，无需超时（用于翻页切换）
function crossfadeBgm(bgm, newSrc, duration = 1000, waitForLoad = false) {
  setVinylLoading(true);
  showBgmLoading('🎵 音乐加载中...');
  
  const newAudio = new Audio();
  newAudio.crossOrigin = 'anonymous';
  newAudio.preload = 'auto';
  newAudio.src = newSrc;
  newAudio.volume = 0;
  
  let crossfadeStarted = false;
  let finished = false;
  let animFrameId = null;
  
  function cleanup() {
    if (finished) return;
    finished = true;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    newAudio.pause();
    newAudio.src = '';
    setVinylLoading(false);
    hideBgmLoading();
  }
  
  function showToast() {
    if (window.__bgmToastShown || window.__bgmPlayed) return;
    window.__bgmToastShown = true;
    const toast = document.getElementById('bgmToast');
    if (toast) {
      toast.style.display = 'block';
      requestAnimationFrame(() => { toast.style.opacity = '1'; });
    }
    const vinylDisc = document.getElementById('vinylDisc');
    if (vinylDisc) vinylDisc.classList.add('hint-pulse');
  }
  
  function hideToast() {
    const toast = document.getElementById('bgmToast');
    if (toast) {
      toast.style.opacity = '0';
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }
    const vinylDisc = document.getElementById('vinylDisc');
    if (vinylDisc) vinylDisc.classList.remove('hint-pulse');
  }
  
  // 真正的 crossfade 开始：新旧音乐同时开始过渡
  function startCrossfade() {
    if (crossfadeStarted || finished) return;
    crossfadeStarted = true;
    
    // BUG 已修复：不再在这里设置 finished = true
    // finished 应该只在 finishTransition 或 cleanup 中设置
    
    hideBgmLoading();
    
    // 新音频以音量 0 开始播放（已经开始流式播放了）
    newAudio.play().catch(() => {});
    
    const startTime = performance.now();
    const oldVolume = bgm.volume || 1;
    
    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 旧音乐淡出（ease-out）
      const easeOut = 1 - Math.pow(1 - progress, 2);
      bgm.volume = Math.max(0, oldVolume * (1 - easeOut));
      
      // 新音乐淡入（ease-in）
      const easeIn = progress * progress;
      newAudio.volume = Math.min(1, easeIn);
      
      if (progress < 1) {
        animFrameId = requestAnimationFrame(animate);
      } else {
        finishTransition();
      }
    }
    
    function finishTransition() {
      const currentTime = newAudio.currentTime;
      
      // 停止旧音频
      bgm.pause();
      
      // 新音频接管到 DOM 元素
      bgm.src = newSrc;
      bgm.load();
      bgm.currentTime = currentTime;
      bgm.volume = 1;
      bgm.play().catch(() => showToast());
      
      // 清理临时音频
      newAudio.pause();
      newAudio.src = '';
      
      setVinylLoading(false);
      window.__bgmPlayed = true;
      sessionStorage.setItem('bgm_playing', 'true');
    }
    
    animFrameId = requestAnimationFrame(animate);
  }
  
  // 加载错误：直接切换
  newAudio.addEventListener('error', () => {
    if (finished) return;
    console.error('新 BGM 加载失败:', newSrc);
    cleanup();
    bgm.src = newSrc;
    bgm.load();
    bgm.volume = 1;
    bgm.play().catch(() => showToast());
  }, { once: true });
  
  // 用 readyState 轮询替代 canplay 事件（更可靠，避免事件不触发）
  let loadPollCount = 0;
  const loadPoll = setInterval(() => {
    loadPollCount++;
    if (newAudio.readyState >= 2) {
      clearInterval(loadPoll);
      startCrossfade();
      return;
    }
    // 8秒超时
    if (loadPollCount > 80) {
      clearInterval(loadPoll);
      if (!crossfadeStarted && !finished) {
        console.log('BGM 加载超时，直接切换:', newSrc);
        cleanup();
        bgm.src = newSrc;
        bgm.load();
        bgm.volume = 1;
        bgm.play().catch(() => showToast());
      }
    }
  }, 100);
  
  // 如果已缓存，readyState 可能已经满足
  if (newAudio.readyState >= 2) {
    clearInterval(loadPoll);
    startCrossfade();
  }
  
  // 开始加载
  newAudio.load();
}`;

const newFunc = `// Crossfade 过渡：旧音乐淡出，新音乐淡入
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
  function startCrossfade() {
    if (state !== 'loading') return;
    state = 'fading';
    
    hideBgmLoading();
    
    const startTime = performance.now();
    
    // 第一步：旧音频淡出（duration/2 时间）
    function fadeOut(now) {
      if (state === 'done') return;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / (duration / 2), 1);
      const easeOut = 1 - Math.pow(1 - progress, 2);
      bgm.volume = Math.max(0, oldVolume * (1 - easeOut));
      
      if (progress < 1) {
        animFrameId = requestAnimationFrame(fadeOut);
      } else {
        // 旧音频淡出完成，切换到新音频
        switchToNew();
      }
    }
    
    animFrameId = requestAnimationFrame(fadeOut);
  }
  
  // 切换到新音频并淡入
  function switchToNew() {
    if (state === 'done') return;
    
    // 切换到新音频
    bgm.pause();
    bgm.src = newSrc;
    bgm.load();
    bgm.volume = 0;
    
    // 播放新音频（bgm 是用户交互元素，play() 更可靠）
    bgm.play().then(() => {
      // 新音频淡入（duration/2 时间）
      const fadeInStart = performance.now();
      
      function fadeIn(now) {
        if (state === 'done') return;
        const elapsed = now - fadeInStart;
        const progress = Math.min(elapsed / (duration / 2), 1);
        const easeIn = progress * progress;
        bgm.volume = Math.min(oldVolume, easeIn);
        
        if (progress < 1) {
          animFrameId = requestAnimationFrame(fadeIn);
        } else {
          cleanup();
          window.__bgmPlayed = true;
          sessionStorage.setItem('bgm_playing', 'true');
        }
      }
      
      animFrameId = requestAnimationFrame(fadeIn);
    }).catch(() => {
      cleanup();
      showToast();
    });
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
}`;

if (content.includes(oldFunc)) {
    content = content.replace(oldFunc, newFunc);
    fs.writeFileSync('src/shared/story-loader.js', content, 'utf8');
    console.log('Replacement successful');
} else {
    console.log('oldFunc not found, length:', oldFunc.length);
}
