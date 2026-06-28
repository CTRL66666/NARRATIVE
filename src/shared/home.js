// ===== 首页动态书架渲染 =====
// 从 stories/config.json 读取故事列表，动态生成书籍卡片

import config from '../stories/config.json';

function renderBookshelf() {
  const bookshelf = document.getElementById('bookshelf');
  if (!bookshelf) return;

  bookshelf.innerHTML = '';

  config.stories.forEach((story, index) => {
    const card = document.createElement('a');
    card.className = `book-card ${story.id}-card`;
    card.href = `./story.html?id=${story.id}`;
    card.dataset.story = story.id;

    card.innerHTML = `
      <div class="book-cover">
        <div class="book-spine"></div>
        <div class="book-front">
          <span class="book-tag">${story.tag}</span>
          <h2 class="book-title">${story.title}</h2>
          <p class="book-author">${story.author}</p>
        </div>
      </div>
      <div class="book-info">
        <p class="book-desc">${story.summary}</p>
        <span class="read-btn">开始阅读</span>
      </div>
    `;

    bookshelf.appendChild(card);

    // 入场动画
    card.style.opacity = '0';
    card.style.transform = 'translateY(40px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 200 + index * 200);
  });
}

function initPageFlip() {
  const pageFlipOverlay = document.getElementById('pageFlipOverlay');
  const bookCards = document.querySelectorAll('.book-card');

  bookCards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const href = card.getAttribute('href');

      if (pageFlipOverlay) {
        pageFlipOverlay.classList.add('active', 'flipping-out');
      }

      setTimeout(() => {
        window.location.href = href;
      }, 650);
    });
  });

  // 页面进入动画（从故事页返回时）
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && pageFlipOverlay) {
      pageFlipOverlay.classList.remove('active', 'flipping-in', 'flipping-out');
    }
  });

  // 初始进入动画
  if (pageFlipOverlay) {
    pageFlipOverlay.classList.add('active', 'flipping-in');
    setTimeout(() => {
      pageFlipOverlay.classList.remove('active', 'flipping-in');
    }, 1000);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  renderBookshelf();
  initPageFlip();
});
