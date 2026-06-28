/* ===== 共享评论模块 ===== */

// 评论存储方案：使用 GitHub Issues 作为"后端"
// 每个故事对应一个 Issue，评论内容存储在 Issue 评论中
// 通过 GitHub API 读取和写入

const GITHUB_OWNER = 'YOUR_GITHUB_USERNAME';  // 替换为你的 GitHub 用户名
const GITHUB_REPO = 'my-stories';               // 替换为你的仓库名
const GITHUB_TOKEN = ''; // 如需写入评论，需要配置 token（建议使用 GitHub Apps 或 OAuth）

// 故事对应的 Issue 编号映射（预先在仓库中创建好 Issue）
const STORY_ISSUE_MAP = {
  'story1': 1,  // 长安夜雨
  'story2': 2,  // 深空信标
  'story3': 3,  // 夏日蝉鸣
};

// 获取当前故事标识
function getCurrentStory() {
  const path = window.location.pathname;
  if (path.includes('story1')) return 'story1';
  if (path.includes('story2')) return 'story2';
  if (path.includes('story3')) return 'story3';
  return null;
}

// 从 URL 参数读取 GitHub 配置（便于本地测试和自定义）
function getGithubConfig() {
  const params = new URLSearchParams(window.location.search);
  return {
    owner: params.get('owner') || GITHUB_OWNER,
    repo: params.get('repo') || GITHUB_REPO,
  };
}

// 加载评论
async function loadComments() {
  const story = getCurrentStory();
  if (!story) return;

  const container = document.getElementById('commentsContainer');
  if (!container) return;

  const issueNumber = STORY_ISSUE_MAP[story];
  const { owner, repo } = getGithubConfig();

  // 如果没有配置 owner，显示提示
  if (owner === 'YOUR_GITHUB_USERNAME') {
    container.innerHTML = `
      <div class="comment-empty">
        <p>评论功能需要配置 GitHub 仓库信息</p>
        <p style="font-size: 0.85rem; margin-top: 8px;">
          在代码中设置 GITHUB_OWNER 和 GITHUB_REPO 即可启用
        </p>
      </div>
    `;
    return;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`
    );

    if (!response.ok) {
      if (response.status === 404) {
        container.innerHTML = `
          <div class="comment-empty">
            <p>暂无评论，来做第一个留言的人吧～</p>
          </div>
        `;
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const comments = await response.json();
    renderComments(comments, container);
  } catch (error) {
    console.error('加载评论失败:', error);
    container.innerHTML = `
      <div class="comment-empty">
        <p>评论加载失败，请稍后重试</p>
        <p style="font-size: 0.85rem; margin-top: 8px;">${error.message}</p>
      </div>
    `;
  }
}

// 渲染评论列表
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
    const date = new Date(comment.created_at);
    const timeStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // 从评论体中提取昵称（格式：昵称: 内容）
    let body = comment.body;
    let author = comment.user.login;
    
    const match = body.match(/^([^:]+):\s*(.+)$/s);
    if (match) {
      author = match[1].trim();
      body = match[2].trim();
    }

    return `
      <div class="comment-item">
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(author)}</span>
          <span class="comment-time">${timeStr}</span>
        </div>
        <div class="comment-body">${escapeHtml(body)}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

// 提交评论
async function submitComment(name, text) {
  const story = getCurrentStory();
  if (!story) return { success: false, error: '无法识别当前故事' };

  const issueNumber = STORY_ISSUE_MAP[story];
  const { owner, repo } = getGithubConfig();

  if (owner === 'YOUR_GITHUB_USERNAME') {
    return { success: false, error: '评论功能尚未配置' };
  }

  // 检查是否有 token（用于写入）
  // 注意：在纯前端环境中，需要使用 GitHub OAuth 或让用户手动提供 token
  // 这里提供两种方案：
  // 方案1：通过 URL 参数传入 token（仅测试用，不推荐生产环境）
  // 方案2：引导用户到 GitHub 创建评论（更安全）
  
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || localStorage.getItem('github_token');

  if (!token) {
    // 没有 token，引导用户到 GitHub 创建评论
    const issueUrl = `https://github.com/${owner}/${repo}/issues/${issueNumber}`;
    return {
      success: false,
      error: '需要 GitHub 身份验证才能发表评论',
      redirectUrl: issueUrl,
    };
  }

  try {
    const commentBody = `${name || '匿名读者'}: ${text}`;
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: commentBody }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('提交评论失败:', error);
    return { success: false, error: error.message };
  }
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 初始化评论功能
export function initComments() {
  loadComments();

  const form = document.getElementById('commentForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('commentName');
    const textInput = document.getElementById('commentText');
    const submitBtn = form.querySelector('.comment-submit');

    const name = nameInput?.value.trim() || '匿名读者';
    const text = textInput?.value.trim();

    if (!text) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';

    const result = await submitComment(name, text);

    if (result.success) {
      textInput.value = '';
      if (nameInput) nameInput.value = '';
      loadComments(); // 重新加载评论
    } else if (result.redirectUrl) {
      // 引导用户到 GitHub 创建评论
      const confirmed = confirm(
        `由于安全限制，需要跳转到 GitHub 页面发表评论。\n\n是否跳转？`
      );
      if (confirmed) {
        window.open(result.redirectUrl, '_blank');
      }
    } else {
      alert(`评论失败：${result.error}`);
    }

    submitBtn.disabled = false;
    submitBtn.textContent = '发表留言';
  });
}

export { loadComments };
