# 智能IDE检测系统实现计划

## 任务上下文
优化两个worktree模板文件中的IDE判断逻辑，从硬编码的"code,cursor,webstorm"改为智能检测系统。

## 核心需求
1. 默认使用VS Code (code)
2. 无code时自动检测其他可用IDE
3. 记住用户IDE偏好
4. 完全移除硬编码IDE名称

## 实现策略

### 1. IDE检测优先级
```bash
检测顺序: code -> cursor -> webstorm -> sublime -> vim -> emacs -> 其他
```

### 2. 配置存储结构
```json
{
  "preferredIDE": "code",
  "detectedIDEs": ["code", "cursor", "webstorm"],
  "autoOpenIDE": false,
  "lastDetectionTime": "2025-08-20T10:00:00Z"
}
```

### 3. 核心函数设计
- `detect_available_ides()` - 系统IDE检测
- `get_preferred_ide()` - 获取用户偏好IDE
- `save_ide_preference()` - 保存偏好设置
- `open_with_ide()` - 智能IDE启动

## 修改文件清单
1. `/templates/en/workflow/git/commands/git-worktree.md`
2. `/templates/zh-CN/workflow/git/commands/git-worktree.md`

## 实现时间
2025-08-20 开始实现

## 预期效果
- 完全移除硬编码IDE名称
- 自动适配用户环境
- 提升用户体验
- 支持IDE偏好记忆