// ===== 统一故事加载器 =====
// 通过 URL ?id=xxx 加载任意故事，无需为每个故事创建独立文件

import config from '../stories/config.json';
import { initVinylPlayer } from './vinyl-player.js';
import { renderStory } from './story-renderer.js';
import { initComments } from '../comments.js';

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

  // 设置 BGM
  const bgm = document.getElementById('bgm');
  if (bgm && storyConfig.bgm) {
    bgm.src = storyConfig.bgm;
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

  // 渲染故事内容
  renderStory(data, storyId);

  // 初始化唱片播放器
  initVinylPlayer('vinylDisc', 'bgm');

  // 初始化评论
  initComments();
}

init().catch(err => {
  console.error('Failed to load story:', err);
});
