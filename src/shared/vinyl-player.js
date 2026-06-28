// ===== 共享模块 · 唱片播放器 =====
// 所有故事页面共用，只需传入 DOM 元素 ID

export function initVinylPlayer(discId, audioId) {
  const vinylDisc = document.getElementById(discId);
  const bgm = document.getElementById(audioId);

  if (!vinylDisc || !bgm) return;

  vinylDisc.addEventListener('click', () => {
    if (bgm.paused) {
      bgm.play().catch(err => {
        console.log('音乐播放失败:', err);
      });
    } else {
      bgm.pause();
    }
  });

  bgm.addEventListener('play', () => {
    vinylDisc.classList.add('playing');
  });

  bgm.addEventListener('pause', () => {
    vinylDisc.classList.remove('playing');
  });

  bgm.addEventListener('ended', () => {
    vinylDisc.classList.remove('playing');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      bgm.pause();
    }
  });
}
