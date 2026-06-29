// ===== 共享模块 · 唱片播放器 =====
// 所有故事页面共用，只需传入 DOM 元素 ID

export function initVinylPlayer(discId, audioId) {
  const vinylDisc = document.getElementById(discId);
  const bgm = document.getElementById(audioId);

  if (!vinylDisc || !bgm) return;

  // 定期保存播放进度到 sessionStorage
  let saveInterval;
  function startSaving() {
    saveInterval = setInterval(() => {
      if (bgm.src) {
        sessionStorage.setItem('bgm_time', bgm.currentTime.toString());
        sessionStorage.setItem('bgm_playing', (!bgm.paused).toString());
      }
    }, 1000);
  }

  function stopSaving() {
    clearInterval(saveInterval);
  }

  vinylDisc.addEventListener('click', () => {
    if (bgm.paused) {
      // 降级恢复：如果 BGM 进度为 0 但有保存的进度，恢复它
      const savedTime = parseFloat(sessionStorage.getItem('bgm_time') || '0');
      if (savedTime > 0 && bgm.currentTime === 0) {
        bgm.currentTime = savedTime;
      }
      bgm.play().catch(err => {
        console.log('音乐播放失败:', err);
      });
      // 用户主动播放，清除暂停标记
      window.__bgmUserPaused = false;
    } else {
      bgm.pause();
      // 用户手动暂停，标记不再自动触发
      window.__bgmUserPaused = true;
    }
  });

  bgm.addEventListener('play', () => {
    vinylDisc.classList.add('playing');
    sessionStorage.setItem('bgm_playing', 'true');
    startSaving();
  });

  bgm.addEventListener('pause', () => {
    vinylDisc.classList.remove('playing');
    sessionStorage.setItem('bgm_playing', 'false');
    if (bgm.src) {
      sessionStorage.setItem('bgm_time', bgm.currentTime.toString());
    }
    stopSaving();
  });

  bgm.addEventListener('ended', () => {
    vinylDisc.classList.remove('playing');
    sessionStorage.setItem('bgm_playing', 'false');
    stopSaving();
  });

  // 页面卸载前保存进度
  window.addEventListener('beforeunload', () => {
    if (bgm.src) {
      sessionStorage.setItem('bgm_time', bgm.currentTime.toString());
      sessionStorage.setItem('bgm_playing', (!bgm.paused).toString());
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      bgm.pause();
    }
  });
}
