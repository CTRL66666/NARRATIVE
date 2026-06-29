/* ===== 共享评论模块 =====
 * 支持两种存储模式：
 * 1. 本地模式（默认）：评论存储在 localStorage，无需账号，零门槛
 * 2. GitHub 模式（可选）：评论同步到 GitHub Issues，需要配置
 */

const GITHUB_OWNER = 'CTRL66666';
const GITHUB_REPO = 'NARRATIVE';

// 故事对应的 Issue 编号映射（可选配置）
const STORY_ISSUE_MAP = {
  'story1': 1,
  'story2': 2,
  'story3': 3,
};

// ===== 获取当前故事 ID =====
function getCurrentStory() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// ===== 获取当前故事章节（用于显示）=====
function getCurrentChapter() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ch') || '1';
}

// ===== 读取本地评论 =====
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

// ===== 保存本地评论 =====
function saveLocalComments(storyId, comments) {
  try {
    const key = `narrative-comments-${storyId}`;
    localStorage.setItem(key, JSON.stringify(comments));
  } catch (e) {
    console.error('保存本地评论失败:', e);
  }
}

// ===== 加载 GitHub 评论（可选）=====
async function loadGithubComments(storyId) {
  const issueNumber = STORY_ISSUE_MAP[storyId];
  if (!issueNumber) return [];

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}/comments`
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

// ===== 合并并排序评论 =====
async function loadAllComments(storyId) {
  const local = loadLocalComments(storyId);
  const github = await loadGithubComments(storyId);
  const all = [...github, ...local];
  // 按时间排序
  all.sort((a, b) => new Date(a.time) - new Date(b.time));
  return all;
}

// ===== 渲染评论列表 =====
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

// ===== 提交评论（本地存储）=====
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

// ===== HTML 转义 =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== 初始化评论功能 =====
export function initComments() {
  const storyId = getCurrentStory();
  if (!storyId) {
    console.warn('无法识别当前故事，评论功能未初始化');
    return;
  }

  // 加载评论
  const container = document.getElementById('commentsContainer');
  if (container) {
    loadAllComments(storyId).then(comments => {
      renderComments(comments, container);
    });
  }

  // 绑定提交表单
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
      // 重新加载并渲染
      const comments = await loadAllComments(storyId);
      renderComments(comments, container);
    } else {
      alert(`评论失败：${result.error}`);
    }

    submitBtn.disabled = false;
    submitBtn.textContent = '发表留言';
  });
}

export { loadAllComments };
