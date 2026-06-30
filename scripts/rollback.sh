#!/bin/bash
# ==========================================
# NARRATIVE 一键回滚脚本
# 用法: ./scripts/rollback.sh [tag_name]
# 示例: ./scripts/rollback.sh v1.0.19
# ==========================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认值：回滚到最新稳定版本
TARGET_TAG="${1:-stable}"

echo "========================================="
echo "NARRATIVE 安全回滚脚本"
echo "目标版本: $TARGET_TAG"
echo "========================================="

# 检查是否在项目根目录
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo -e "${RED}❌ 错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 检查是否有未提交的修改
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  警告: 有未提交的修改${NC}"
    echo "请先提交或暂存当前修改:"
    echo "  git add -A && git commit -m '保存当前工作'"
    read -p "是否继续回滚? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "已取消"
        exit 0
    fi
fi

# 获取目标版本的 commit SHA
echo ""
echo "步骤 1/5: 获取目标版本..."
if git rev-parse "$TARGET_TAG" >/dev/null 2>&1; then
    TARGET_SHA=$(git rev-parse "$TARGET_TAG")
    echo -e "${GREEN}✅ 找到版本: $TARGET_TAG ($TARGET_SHA)${NC}"
else
    echo -e "${RED}❌ 错误: 版本 $TARGET_TAG 不存在${NC}"
    echo "可用版本:"
    git tag -l | tail -10
    echo "或使用分支: main, stable"
    exit 1
fi

# 步骤 2: 备份当前状态
echo ""
echo "步骤 2/5: 备份当前状态..."
BACKUP_BRANCH="backup-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP_BRANCH"
echo -e "${GREEN}✅ 已创建备份分支: $BACKUP_BRANCH${NC}"

# 步骤 3: 回滚核心文件
echo ""
echo "步骤 3/5: 回滚核心文件..."

# 回滚 HTML 文件（从目标版本）
git checkout "$TARGET_TAG" -- index.html story.html

# 回滚 src/ 目录
git checkout "$TARGET_TAG" -- src/

# 回滚配置文件
git checkout "$TARGET_TAG" -- vite.config.js package.json

# 回滚 .github/workflows
git checkout "$TARGET_TAG" -- .github/workflows/

# 保留当前日志文件（不覆盖）
if [ -f "DEVLOG.md" ]; then
    mv DEVLOG.md DEVLOG.md.backup
fi

git checkout "$TARGET_TAG" -- DEVLOG.md

# 合并日志（保留当前备份）
if [ -f "DEVLOG.md.backup" ]; then
    # 保留备份中的最新内容
    echo "" >> DEVLOG.md
    echo "--- 当前日志备份 ---" >> DEVLOG.md
    cat DEVLOG.md.backup >> DEVLOG.md
    rm DEVLOG.md.backup
fi

echo -e "${GREEN}✅ 核心文件已回滚${NC}"

# 步骤 4: 清理旧的构建产物
echo ""
echo "步骤 4/5: 清理旧构建产物..."

# 统计旧的构建产物
OLD_COUNT=$(ls -1 assets/*.js assets/*.css 2>/dev/null | wc -l)

# 删除所有旧的构建产物（保留当前构建产物的引用）
rm -rf assets/*.js assets/*.css 2>/dev/null || true

echo -e "${GREEN}✅ 已清理 $OLD_COUNT 个旧构建产物${NC}"

# 步骤 5: 验证回滚
echo ""
echo "步骤 5/5: 验证回滚..."
ERRORS=0

# 检查 index.html 引用
if grep -q "src/" index.html; then
    echo -e "${GREEN}✅ index.html 引用正确 (src/)${NC}"
else
    echo -e "${RED}❌ index.html 引用错误 (不是 src/ 引用)${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 检查 story.html 引用
if grep -q "src/" story.html; then
    echo -e "${GREEN}✅ story.html 引用正确 (src/)${NC}"
else
    echo -e "${RED}❌ story.html 引用错误 (不是 src/ 引用)${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 检查 DOM 结构
if grep -q "novel-header" story.html && grep -q "novel-content" story.html; then
    echo -e "${GREEN}✅ story.html DOM 结构完整${NC}"
else
    echo -e "${RED}❌ story.html DOM 结构不完整${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 检查 node_modules 不在 Git 中
if git ls-files | grep -q "^node_modules"; then
    echo -e "${RED}❌ node_modules/ 仍在 Git 中${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ node_modules/ 不在 Git 中${NC}"
fi

# 检查 story-loader.js 存在
if [ -f "src/shared/story-loader.js" ]; then
    echo -e "${GREEN}✅ story-loader.js 存在${NC}"
else
    echo -e "${RED}❌ story-loader.js 不存在${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "========================================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ 回滚成功！所有验证通过${NC}"
    echo ""
    echo "下一步："
    echo "  1. 本地测试: npm run dev"
    echo "  2. 构建验证: npm run build"
    echo "  3. 提交推送: git add -A && git commit -m 'rollback: $TARGET_TAG' && git push origin main"
    echo ""
    echo "备份分支: $BACKUP_BRANCH"
    echo "如需恢复当前版本: git checkout $BACKUP_BRANCH"
else
    echo -e "${RED}❌ 回滚失败！发现 $ERRORS 个错误${NC}"
    echo "请检查错误信息，或从备份恢复:"
    echo "  git checkout $BACKUP_BRANCH"
    exit 1
fi

echo "========================================="
