# 参数缩写映射方案

## 单字符缩写分配

基于 CAC 只支持单字符缩写的限制，设计如下映射：

### 已有缩写（保持不变）
- `--lang, -l` ✅ (ZCF display language)
- `--force, -f` ✅ (Force overwrite)
- `--help, -h` ✅ (Help)
- `--version, -v` ✅ (Version)

### 新增缩写（字母优先级分配）
- `--skip-prompt, -s` (Skip - 最重要，使用 s)
- `--config-lang, -c` (Config - 保持原有 c)
- `--ai-output-lang, -a` (AI - 保持原有 a)
- `--api-type, -t` (Type - 使用 t)
- `--api-key, -k` (Key - 使用 k) 
- `--api-url, -u` (URL - 使用 u)
- `--config-action, -o` (actiOn - 使用 o)
- `--mcp-services, -m` (MCP - 使用 m)
- `--workflows, -w` (Workflow - 使用 w)
- `--ai-personality, -p` (Personality - 使用 p)
- `--all-lang, -g` (lanGuage - 使用 g，因为 l 已被占用)
- `--install-cometix-line, -i` (Install - 使用 i)

## 冲突处理
- 避免与现有的 `-l`, `-f`, `-h`, `-v` 冲突
- 选择最具代表性的字母
- 优先考虑使用频率高的参数