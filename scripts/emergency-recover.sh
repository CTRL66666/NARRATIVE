#!/bin/bash
# ==========================================
# NARRATIVE 终极恢复脚本
# 场景: 本地和云端 main 分支都被污染，需要彻底恢复
# 用法: ./scripts/emergency-recover.sh [tag_name]
# 原理: 即使 main 分支被重写、文件被删除，Git Tag 仍然保存完整历史
# ==========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TARGET_TAG="${1:-v1.0.19}"

echo "========================================="
echo "NARRATIVE 终极恢复"
echo "目标: $TARGET_TAG"
echo "========================================="

# 1. 检查 Git 是否在健康状态
echo ""
echo "步骤 1/8: 检查 Git 仓库..."
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ 错误: 当前目录不是 Git 仓库${NC}"
    echo "  如果仓库完全丢失，需要从 GitHub 重新克隆:"
    echo "    git clone https://github.com/CTRL66666/NARRATIVE.git"
    exit 1
fi
echo -e "${GREEN}✅ Git 仓库存在${NC}"

# 2. 检查 Tag 是否存在
echo ""
echo "步骤 2/8: 检查 Tag 是否存在..."
if ! git rev-parse "$TARGET_TAG" >/dev/null 2>&1; then
    echo -e "${RED}❌ 错误: Tag $TARGET_TAG 不存在${NC}"
    echo "  可用 Tag:"
    git tag -l | tail -10
    echo "  如果所有 Tag 都丢失，可以尝试从 GitHub 获取:"
    echo "    git fetch --tags origin"
    exit 1
fi
TAG_COMMIT=$(git rev-list -n 1 "$TARGET_TAG")
echo -e "${GREEN}✅ Tag $TARGET_TAG 存在，指向 commit $TAG_COMMIT${NC}"

# 3. 检查本地文件是否被严重污染
echo ""
echo "步骤 3/8: 评估污染程度..."
POLLUTION_LEVEL=0

if [ -f "index.html" ] && grep -q "assets/" index.html; then
    echo -e "${YELLOW}⚠️  index.html 被构建产物污染${NC}"
    POLLUTION_LEVEL=$((POLLUTION_LEVEL + 1))
fi

if [ -f "story.html" ] && grep -q "assets/" story.html; then
    echo -e "${YELLOW}⚠️  story.html 被构建产物污染${NC}"
    POLLUTION_LEVEL=$((POLLUTION_LEVEL + 1))
fi

if [ -f "src/shared/story-loader.js" ]; then
    echo -e "${GREEN}✅ 源码文件存在${NC}"
else
    echo -e "${RED}❌ 源码文件缺失${NC}"
    POLLUTION_LEVEL=$((POLLUTION_LEVEL + 10))
fi

if [ $POLLUTION_LEVEL -eq 0 ]; then
    echo -e "${GREEN}✅ 污染程度低，可直接恢复${NC}"
elif [ $POLLUTION_LEVEL -lt 5 ]; then
    echo -e "${YELLOW}⚠️  污染程度中等${NC}"
else
    echo -e "${RED}❌ 污染严重，需要完全重建${NC}"
fi

# 4. 创建紧急备份
echo ""
echo "步骤 4/8: 创建紧急备份..."
EMERGENCY_BRANCH="emergency-$(date +%Y%m%d-%H%M%S)"
if git rev-parse HEAD >/dev/null 2>&1; then
    git branch "$EMERGENCY_BRANCH" HEAD
    echo -e "${GREEN}✅ 已创建紧急备份分支: $EMERGENCY_BRANCH${NC}"
else
    echo -e "${YELLOW}⚠️  HEAD 不可用，跳过本地备份${NC}"
fi

# 5. 从 Tag 恢复所有文件
echo ""
echo "步骤 5/8: 从 Tag 恢复所有文件..."
# 恢复核心文件
git checkout "$TARGET_TAG" -- index.html story.html 2>/dev/null || {
    echo -e "${RED}❌ 无法恢复 HTML 文件，可能已被删除${NC}"
    echo "  从 Tag 提取..."
    git show "$TARGET_TAG:index.html" > index.html
    git show "$TARGET_TAG:story.html" > story.html
}

git checkout "$TARGET_TAG" -- src/ 2>/dev/null || {
    echo -e "${YELLOW}⚠️  无法恢复 src/ 目录，可能已删除${NC}"
    echo "  从 Tag 提取完整目录..."
    # 创建临时目录，从 Tag 提取
    mkdir -p .tmp-recover
    git archive "$TARGET_TAG" src/ | tar -x -C .tmp-recover/
    if [ -d ".tmp-recover/src" ]; then
        rm -rf src/
        mv .tmp-recover/src ./
        rm -rf .tmp-recover
    fi
}

git checkout "$TARGET_TAG" -- vite.config.js package.json .github/workflows/ 2>/dev/null || true
git checkout "$TARGET_TAG" -- scripts/ 2>/dev/null || true
git checkout "$TARGET_TAG" -- DEVLOG.md SAFE_DEPLOY.md 2>/dev/null || true

echo -e "${GREEN}✅ 文件已恢复${NC}"

# 6. 清理所有构建产物（彻底清理）
echo ""
echo "步骤 6/8: 清理所有构建产物..."
rm -rf dist/ 2>/dev/null || true
rm -rf assets/*.js 2>/dev/null || true
rm -rf assets/*.css 2>/dev/null || true
# 保留音频文件（如果有）
if ls assets/*.mp3 2>/dev/null >/dev/null; then
    echo -e "${BLUE}ℹ️  保留音频文件${NC}"
fi

# 清理 node_modules（如果它在 Git 中，现在删除）
if git ls-files | grep -q "^node_modules"; then
    echo -e "${YELLOW}⚠️  发现 node_modules 在 Git 中，正在清理...${NC}"
    git rm -r --cached node_modules 2>/dev/null || true
    rm -rf node_modules
fi

echo -e "${GREEN}✅ 清理完成${NC}"

# 7. 重新安装依赖（如果 node_modules 被删除）
echo ""
echo "步骤 7/8: 重新安装依赖..."
if [ ! -d "node_modules" ]; then
    if command -v npm >/dev/null 2>&1; then
        npm install
        echo -e "${GREEN}✅ 依赖安装完成${NC}"
    else
        echo -e "${YELLOW}⚠️  npm 不可用，请手动运行 npm install${NC}"
    fi
else
    echo -e "${GREEN}✅ 本地 node_modules 存在${NC}"
fi

# 8. 验证恢复结果
echo ""
echo "步骤 8/8: 验证恢复结果..."
ERRORS=0

checks=(
    "index.html:src/"
    "story.html:novel-header"
    "src/shared/story-loader.js:"
    "src/stories/config.json:"
)

for check in "${checks[@]}"; do
    file="${check%%:*}"
    pattern="${check##*:}"
    if [ -f "$file" ]; then
        if [ -n "$pattern" ] && grep -q "$pattern" "$file" 2>/dev/null; then
            echo -e "${GREEN}✅ $file 正确${NC}"
        elif [ -z "$pattern" ]; then
            echo -e "${GREEN}✅ $file 存在${NC}"
        else
            echo -e "${RED}❌ $file 内容不匹配${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "${RED}❌ $file 不存在${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "========================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ 终极恢复成功！${NC}"
    echo ""
    echo "下一步："
    echo "  1. 本地测试: npm run dev"
    echo "  2. 构建验证: npm run build"
    echo "  3. 提交修复: git add -A && git commit -m 'recover: $TARGET_TAG' && git push origin main"
    echo ""
    echo "备份分支: $EMERGENCY_BRANCH"
    echo "如果恢复失败，可以从备份恢复:"
    echo "  git checkout $EMERGENCY_BRANCH"
else
    echo -e "${RED}❌ 恢复有 $ERRORS 个问题，请检查${NC}"
    echo "  如果问题严重，尝试完全重新克隆："
    echo "    cd .."
    echo "    rm -rf NARRATIVE"
    echo "    git clone https://github.com/CTRL66666/NARRATIVE.git"
    echo "    cd NARRATIVE"
    echo "    git checkout v1.0.19"
    exit 1
fi

echo "========================================="
