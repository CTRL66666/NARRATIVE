#!/bin/bash
# ==========================================
# NARRATIVE 构建前安全检查
# 用法: ./scripts/pre-build-check.sh
# 在 npm run build 之前运行，验证所有必要条件
# ==========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo "========================================="
echo "NARRATIVE 构建前安全检查"
echo "========================================="

# 1. 检查是否在项目根目录
echo ""
echo "检查 1/7: 项目目录..."
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo -e "${RED}❌ 错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 通过${NC}"

# 2. 检查 index.html 引用
echo ""
echo "检查 2/7: index.html 引用..."
if grep -q "src/" index.html; then
    echo -e "${GREEN}✅ 引用 src/ 目录（正确）${NC}"
elif grep -q "assets/" index.html; then
    echo -e "${RED}❌ 错误: 引用 assets/（被污染的构建产物）${NC}"
    echo "  修复: git checkout stable -- index.html"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${RED}❌ 错误: 未找到 src/ 或 assets/ 引用${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 3. 检查 story.html 引用
echo ""
echo "检查 3/7: story.html 引用..."
if grep -q "src/" story.html; then
    echo -e "${GREEN}✅ 引用 src/ 目录（正确）${NC}"
elif grep -q "assets/" story.html; then
    echo -e "${RED}❌ 错误: 引用 assets/（被污染的构建产物）${NC}"
    echo "  修复: git checkout stable -- story.html"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${RED}❌ 错误: 未找到 src/ 或 assets/ 引用${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 4. 检查 DOM 结构
echo ""
echo "检查 4/7: story.html DOM 结构..."
MISSING=""
if ! grep -q "novel-header" story.html; then
    MISSING="$MISSING novel-header"
fi
if ! grep -q "novel-content" story.html; then
    MISSING="$MISSING novel-content"
fi
if ! grep -q "novel-page" story.html; then
    MISSING="$MISSING novel-page"
fi
if ! grep -q "comments-section" story.html; then
    MISSING="$MISSING comments-section"
fi

if [ -z "$MISSING" ]; then
    echo -e "${GREEN}✅ 所有 DOM 结构完整${NC}"
else
    echo -e "${RED}❌ 缺失 DOM 结构:$MISSING${NC}"
    echo "  修复: git checkout stable -- story.html"
    ERRORS=$((ERRORS + 1))
fi

# 5. 检查 node_modules 不在 Git 中
echo ""
echo "检查 5/7: node_modules 不在 Git 中..."
if git ls-files | grep -q "^node_modules"; then
    NODE_COUNT=$(git ls-files | grep "^node_modules" | wc -l)
    echo -e "${RED}❌ 错误: $NODE_COUNT 个 node_modules 文件在 Git 中${NC}"
    echo "  修复: git rm -r --cached node_modules && git commit -m 'fix: 移除 node_modules'"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ 通过${NC}"
fi

# 6. 检查 dist/ 目录
echo ""
echo "检查 6/7: dist/ 目录..."
if [ -d "dist" ]; then
    echo -e "${YELLOW}⚠️ 警告: dist/ 目录存在（构建产物）${NC}"
    echo "  建议: rm -rf dist/ 后再构建，避免旧文件干扰"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ 不存在（干净）${NC}"
fi

# 7. 检查 assets/ 中是否有重复版本
echo ""
echo "检查 7/7: assets/ 构建产物..."
if [ -d "assets" ]; then
    STORY_COUNT=$(ls -1 assets/story-*.js 2>/dev/null | wc -l)
    MAIN_COUNT=$(ls -1 assets/main-*.js 2>/dev/null | wc -l)
    
    if [ "$STORY_COUNT" -gt 1 ] || [ "$MAIN_COUNT" -gt 1 ]; then
        echo -e "${YELLOW}⚠️ 警告: 有多个版本构建产物${NC}"
        echo "  story-*.js: $STORY_COUNT 个"
        echo "  main-*.js: $MAIN_COUNT 个"
        echo "  建议: rm -rf assets/ 后再构建"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ 构建产物数量正常${NC}"
    fi
else
    echo -e "${GREEN}✅ 不存在（干净）${NC}"
fi

echo ""
echo "========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ 所有检查通过！可以安全构建${NC}"
    echo ""
    echo "下一步: npm run build"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️ 有 $WARNINGS 个警告，但无错误${NC}"
    echo "  可以选择继续构建，或先修复警告"
    exit 0
else
    echo -e "${RED}❌ 有 $ERRORS 个错误，必须修复后才能构建${NC}"
    exit 1
fi
