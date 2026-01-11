# BMad-Init 模板优化计划

## 任务上下文

根据实际测试流程，优化两个 bmad-init.md 模板文件，解决交互式安装问题。

## 实际测试发现的问题

1. **简单输入重定向失败**：`echo -e "1\\n" |` 无法处理 BMad 安装程序的交互式选择
2. **成功解决方案**：使用 `expect` 工具能可靠地自动化交互过程
3. **缺少工具检查**：没有验证 expect 工具的可用性
4. **错误处理不足**：缺少对不同安装情况的处理

## 优化方案：Expect 优先方案

### 核心改进

1. **工具可用性检查**：检测 expect 工具是否可用
2. **Expect 自动化**：使用 expect 处理交互式安装过程
3. **降级方案**：提供备用安装方法
4. **详细反馈**：改进用户反馈和错误提示

### 技术实现要点

```javascript
// 1. 检查 expect 工具可用性
const hasExpect = checkExpectAvailability()

// 2. 使用 expect 自动化交互
if (hasExpect) {
  installWithExpect()
} else {
  fallbackInstallation()
}

// 3. 详细的错误处理和用户反馈
```

### 修改文件列表

1. `templates/zh-CN/workflow/bmad/commands/bmad-init.md` - 中文版优化
2. `templates/en/workflow/bmad/commands/bmad-init.md` - 英文版优化

## 执行步骤

1. [x] 分析当前模板文件结构和问题
2. [ ] 创建优化后的中文模板实现
3. [ ] 创建优化后的英文模板实现
4. [ ] 验证两个模板的一致性和功能
5. [ ] 测试优化后的安装流程

## 预期结果

- 可靠的交互式安装处理
- 清晰的错误提示和降级方案
- 更好的用户体验和反馈
- 保持原有功能完整性

## 技术选择

- **主要方法**：expect 工具自动化交互
- **降级方案**：手动指导安装
- **错误处理**：渐进式降级
- **用户反馈**：详细的状态信息