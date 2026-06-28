// ===== 共享模块 · 故事渲染器 =====
// 从传入的数据对象渲染故事内容，支持多章节

export function renderStory(data, storyId) {
  // 获取 URL 中的章节参数
  const params = new URLSearchParams(window.location.search);
  let chapterIndex = parseInt(params.get('ch')) || 0;
  if (chapterIndex < 0) chapterIndex = 0;
  if (chapterIndex >= data.chapters.length) chapterIndex = data.chapters.length - 1;
  
  const chapter = data.chapters[chapterIndex];
  
  document.title = `${chapter.title || data.title} · 我的故事集`;
  
  // 设置章节主题属性（触发 CSS 变量覆盖）
  document.body.dataset.chapter = chapterIndex + 1;
  
  // 渲染头部
  renderHeader(data, chapter, chapterIndex);
  // 渲染章节导航
  renderChapterNav(data, chapterIndex, storyId);
  // 渲染内容
  renderContent(chapter);
  // 渲染底部导航
  renderFooterNav(data, chapterIndex, storyId);
  
  return data;
}

function renderHeader(data, chapter, chapterIndex) {
  const header = document.querySelector('.novel-header');
  if (!header) return;
  
  const chapterMark = chapterIndex === 0 && data.chapters.length === 1 
    ? data.volume || '卷一'
    : `第 ${chapterIndex + 1} 章`;
    
  header.innerHTML = `
    <div class="novel-chapter-mark">${chapterMark}</div>
    <h1 class="novel-title" data-text="${chapter.title || data.title}">${chapter.title || data.title}</h1>
    <p class="novel-author">${data.author} 著</p>
    <div class="novel-divider"><span>◈</span></div>
  `;
}

function renderChapterNav(data, currentIndex, storyId) {
  if (data.chapters.length <= 1) return;
  
  // 清除旧的章节导航（防止重复）
  document.querySelectorAll('.chapter-list, .chapter-select').forEach(el => el.remove());
  
  // 桌面端：章节列表
  let listHtml = '<div class="chapter-list">';
  data.chapters.forEach((ch, i) => {
    const active = i === currentIndex ? 'active' : '';
    listHtml += `<a href="./story.html?id=${storyId}&ch=${i}" class="${active}">${ch.title || `第${i+1}章`}</a>`;
  });
  listHtml += '</div>';
  
  const header = document.querySelector('.novel-header');
  if (header) {
    header.insertAdjacentHTML('afterend', listHtml);
  }
  
  // 移动端：下拉选择器
  const navCenter = document.querySelector('.nav-center');
  if (navCenter) {
    let selectHtml = '<select class="chapter-select" onchange="window.location.href=this.value">';
    data.chapters.forEach((ch, i) => {
      const selected = i === currentIndex ? 'selected' : '';
      selectHtml += `<option value="./story.html?id=${storyId}&ch=${i}" ${selected}>${ch.title || `第${i+1}章`}</option>`;
    });
    selectHtml += '</select>';
    navCenter.insertAdjacentHTML('beforeend', selectHtml);
  }
}

function renderContent(chapter) {
  const content = document.querySelector('.novel-content');
  if (!content) return;
  
  let html = '';
  chapter.paragraphs.forEach(p => {
    if (p.type === 'quote') {
      html += `<blockquote class="novel-quote">${p.text}</blockquote>`;
    } else {
      html += `<p class="novel-paragraph">${p.text}</p>`;
    }
  });
  
  if (chapter.isEnd || !chapter.nextChapter) {
    html += `<div class="novel-end-mark"><span>—— 全文完 ——</span></div>`;
  }
  
  content.innerHTML = html;
}

function renderFooterNav(data, currentIndex, storyId) {
  const footer = document.querySelector('.novel-nav-footer');
  if (!footer) return;
  
  const chapters = data.chapters;
  let html = '';
  
  if (currentIndex > 0) {
    html += `<a href="./story.html?id=${storyId}&ch=${currentIndex - 1}" class="novel-footer-btn">← ${chapters[currentIndex - 1].title || `第${currentIndex}章`}</a>`;
  } else {
    html += `<a href="./index.html" class="novel-footer-btn">← 返回书架</a>`;
  }
  
  if (currentIndex < chapters.length - 1) {
    html += `<a href="./story.html?id=${storyId}&ch=${currentIndex + 1}" class="novel-footer-btn primary">${chapters[currentIndex + 1].title || `第${currentIndex + 2}章`} →</a>`;
  } else if (data.nextStory) {
    html += `<a href="./story.html?id=${data.nextStory}" class="novel-footer-btn primary">下一篇：${data.nextStoryTitle} →</a>`;
  } else {
    html += `<a href="./index.html" class="novel-footer-btn primary">返回书架 →</a>`;
  }
  
  footer.innerHTML = html;
}
