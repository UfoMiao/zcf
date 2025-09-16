# ZCF WSL 支持实施计划

## 项目概述

为 ZCF (Zero-Config Code Flow) 添加 Windows Subsystem for Linux (WSL) 环境检测和支持，确保用户在 WSL 中能够顺畅使用 ZCF 配置 Claude Code。

## 背景调研

### Claude Code 在 WSL 中的要求
- Claude Code 不原生支持 Windows，必须在 WSL 环境中运行
- 需要 WSL2 版本（WSL1 不足以支持）
- 依赖：Node.js 18+、npm（ZCF 运行已确保存在）
- 常见问题：默认 WSL 发行版冲突（特别是 Docker Desktop 导致的 Alpine 冲突）

### WSL 环境特征
- `/proc/version` 文件包含 "Microsoft" 或 "WSL" 字符串
- 环境变量 `WSL_DISTRO_NAME` 存在
- Windows 驱动挂载点 `/mnt/c` 等存在
- 特殊的路径结构和权限处理

## 技术方案

### 设计原则
- **最小侵入**：参考现有 Termux 支持模式，仅添加必要的检测和提示
- **用户友好**：提供清晰的 WSL 环境反馈和安装指导
- **向后兼容**：不影响现有 Windows/macOS/Linux 支持

### 核心功能

#### 1. WSL 环境检测
```typescript
// src/utils/platform.ts 扩展
export function isWSL(): boolean
export function getWSLDistro(): string | null
export function getWSLInfo(): WSLInfo | null
```

#### 2. 安装器增强
```typescript
// src/utils/installer.ts 更新
// 在 installClaudeCode() 中添加 WSL 特定逻辑
```

#### 3. 国际化支持
```json
// src/i18n/locales/*/common.json
{
  "wsl": {
    "detected": "WSL 环境已检测到 ({{distro}})",
    "installInfo": "Claude Code 将安装在 WSL 环境中",
    "pathInfo": "配置文件位置：{{path}}"
  }
}
```

## 实施步骤

### 第一阶段：基础 WSL 检测
1. **编写测试用例**
   - WSL 环境模拟测试
   - 检测功能准确性验证

2. **实现检测功能**
   - `platform.ts` 中添加 WSL 检测函数
   - 环境信息获取函数

3. **更新安装器**
   - 添加 WSL 环境提示
   - 优化安装流程体验

4. **国际化更新**
   - 中英文 WSL 相关文本

### 第二阶段：集成测试
1. **功能集成验证**
2. **用户体验测试**
3. **边界情况处理**

## 预期用户体验

```bash
# 用户在 WSL 中运行 npx zcf
$ npx zcf

ℹ WSL 环境已检测到 (Ubuntu 22.04)
ℹ Claude Code 将安装在 WSL 环境中
ℹ 配置文件位置：/home/username/.claude/

正在安装 Claude Code...
✔ Claude Code 安装成功

# 后续配置流程与其他环境一致
```

## 技术实现细节

### WSL 检测逻辑
```typescript
export function isWSL(): boolean {
  // 检查 /proc/version 文件
  if (existsSync('/proc/version')) {
    const version = readFileSync('/proc/version', 'utf8')
    if (version.includes('Microsoft') || version.includes('WSL')) {
      return true
    }
  }
  
  // 检查环境变量
  if (process.env.WSL_DISTRO_NAME) {
    return true
  }
  
  // 检查 Windows 挂载点
  return existsSync('/mnt/c')
}
```

### 发行版信息获取
```typescript
export function getWSLDistro(): string | null {
  // 优先使用环境变量
  if (process.env.WSL_DISTRO_NAME) {
    return process.env.WSL_DISTRO_NAME
  }
  
  // 从 /etc/os-release 读取
  try {
    const osRelease = readFileSync('/etc/os-release', 'utf8')
    const nameMatch = osRelease.match(/^PRETTY_NAME="(.+)"$/m)
    return nameMatch ? nameMatch[1] : null
  } catch {
    return null
  }
}
```

## 风险评估

### 低风险
- WSL 检测逻辑简单可靠
- 不影响现有功能
- 参考已有的 Termux 支持模式

### 缓解措施
- 充分的单元测试覆盖
- 边界情况处理
- 用户友好的错误提示

## 成功指标

- [x] WSL 环境被正确检测和识别
- [x] 用户在 WSL 中获得清晰的环境反馈
- [x] Claude Code 安装流程在 WSL 中正常工作
- [x] 所有现有功能保持兼容性
- [x] 中英文国际化支持完整

## 后续扩展可能

未来可考虑的增强功能：
- WSL 发行版推荐（如检测到 Alpine 时建议切换到 Ubuntu）
- WSL 配置优化建议
- Windows-WSL 路径转换工具

---

**实施时间预估**：2-3 小时
**测试时间预估**：1-2 小时
**总体复杂度**：低-中等