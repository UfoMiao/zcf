作者简介：我是苗大，一个热爱coding的开发者，开源项目ZCF的作者
一、安装
确保有node 20+环境（如果使用ccr则推荐22+），在终端中通过zcf进行安装：
为什么推荐使用zcf：
1. 无需关注复杂的配置文件，快速配置，减少试错成本
2. 自动配置常用工作流和mcp等，快速体验完整版Claude Code
3. 自动备份旧配置，便于回滚
1. 交互式流程安装
适合喜欢自定义配置的用户：
# 选择claude code和语言后，选择【完整初始化】，按流程选择需要的自定义配置
npx zcf
2. 无交互一键安装
适合小白和不喜欢交互流程的用户：
# 替换下面url和key的值为实际值，此处url用的是智谱ai的
# 完整版
npx zcf i --skip-prompt --code-type claude-code --all-lang zh-CN --api-url "https://open.bigmodel.cn/api/anthropic" --api-key "your-api-key-here"
# 缩写版（与完整版效果一样,推荐）
npx zcf i -s -T cc -g zh-CN -u "https://open.bigmodel.cn/api/anthropic" -k "your-api-key-here"
[图片]
[图片]
安装后你将得到
1. 完善的隐私保护环境变量和权限配置
2. api代理配置
3. 全局输出风格和输出语言配置
4. 多个常用工作流配置
5. 多个常用MCP配置
6. 状态栏自动安装和配置

二、Claude Code工作流相关配置介绍
自定义工作流配置主要分以下几种：
1. 输出风格 (output-style)
- 修改的是部分系统提示词，优先级很高，适合放一些通用规范和 AI 角色设定；
- 可以通过 zcf 菜单 6 里切换全局的输出风格；也可以在 cc 里通过 /output-style 进行项目级输出风格快速切换
2. 全局记忆和项目记忆 (CLAUDE.md)
- 全局的目前 zcf 的只放了语言设定（Always respond in Chinese-simplified）, 因为规范放这里效果没输出风格好，占用上下文，一多了就容易不遵守；
- 项目的建议先通过 /init-project 生成（生成的是层级 CLAUDE.md，可以避免项目太大内容多一下子把上下文撑满，当 AI 调用到对应的子目录时候会自动读取到对应的项目记忆），然后有需要加的项目规范再让 AI 加到对应的 CLAUDE.md 里就好（比如：避免硬编码，需要使用 i18n）
3. 斜杠指令 (commands)
- 可以认为是各种工作流的入口指令，zcf 里提供了 /zcf:workflow 等指令，使用方法就是直接在后面跟需求内容后发送；可以用 tab 快速补全，比如：/w 或 /fl 加 tab，然后加需求：开发xxx功能，具体的prd见：miao/xxx.md
4. 代理 (agents)
- 正常不需要主动调用，由斜杠指令里定义什么步骤调用什么代理，比如 /zcf:feat 里调用了 planner 和 ui-ux-designer
5. 钩子 (hooks)
- 这个目前 zcf 没有配置，hook 可以实现在 cc 不同状态时候触发指定的功能，比如：任务结束时发送系统通知；每次编辑完文件进行 eslint 格式化

Claude Code官方配置文档：https://docs.claude.com/zh-CN/docs/claude-code/hooks-guide
小技巧：可在搜索框内用中文问AI咨询具体配置细节或使用方法
三、常用指令
1. Claude Code 自带指令
- /resume 可以查看历史对话并恢复；
- /rewind 是 cc2.0 新增的回滚操作；
- 双击esc 可以快速回退到当前上下文之前的对话；
- /clear 可以清空上下文，相当于新开个对话；
- /compact 可以压缩上下文，不手动的话默认会在 80% 左右自动压缩，不建议自动压缩，容易做一半时候压缩导致上下文丢失，手动压缩也不是很建议，建议让输出任务和进度文档，然后重开时候引用这个文档继续；
- /export 【新功能】可以导出当前对话到剪切板或生成 text 文件；适合开新对话继续之前任务时候使用，让 AI 读取导出的对话文件获取进度
- ! 临时切换到bash模式，可以运行bash命令，且AI可以在之后的对话中看到之前的执行结果，比如：!npm i，AI会说看到了用户刚在安装了依赖，我继续任务...
- # 可以快速增加记忆到CLAUDE.md，示例：#注释必须使用英文
2. zcf 附加指令
初始化项目记忆
-  /zcf:init-project，可以说是自带的 /init 的上位替代，会自动在各个目录生成层级项目记忆文件 CLAUDE.md，便于 AI 更好地理解项目细节；
大型项目不会一次性分析完，可以多次执行，会自动续上进度；
新项目可以等项目架构搭建完毕再跑；
之后隔一段时间跑一次，会增量更新项目里的新功能；
工作流指令
- /zcf:workflow 是zcf主推的工作流，zcf项目也是通过这个工作流开发出来的；比较通用，适合中小型功能开发；大型的最好先拆分一下需求再使用；
- /zcf:feat 和 workflow 用法一样，适合新功能开发，分为计划和 UI 阶段
- /zcf:bmad-init 是项目级的敏捷开发工作流，只需要在项目内运行一次即可，之后需要重启 cc，运行完会有指引，会有一套 bmad 的新指令出现，比较复杂；
- spec-workflow 是 kiro 那套工作流，是 mcp，触发方式是不使用其他指令，直接说使用spec开发xxx功能；
bmad 和 spec 可以去对应的 github 看看官方介绍，更详细点，也可以让 ai 给你介绍
Git 操作
- /git-commit - 智能提交，自动暂存和生成提交信息，并会智能拆分内容进行多次提交
- /git-rollback - 安全回滚到之前提交
- /git-cleanBranches - 清理已合并分支
- /git-worktree - 管理 Git 工作树智能指令 【推荐】
worktree 功能可能很多人都没有使用过，这里简单介绍下，worktree 可以很方便的创建一个项目的工作区（副本），并且切换不同的分支，两个工作区互不干扰，并且使用的是一套 git
worktree 用处：可以并行多个 claude code 在不同的工作区，它们分别执行不同的任务，做完后可以快速合并，甚至可以开一个工作区自己也一起开发，把一些不放心 AI 做的自己做，互不干扰
下面介绍下 zcf 里这个 git-worktree 指令：
描述：管理 Git worktree，在项目平级的 ../.zcf/ 项目名 / 目录下创建，支持智能默认、IDE 集成和内容迁移
使用方法（看一眼知道有哪些功能就行，不用记）：
# 基本操作
/git-worktree add <path>                           # 从 main/master 创建名为 <path> 的新分支
/git-worktree add <path> -b <branch>               # 创建指定名称的新分支
/git-worktree add <path> -o                        # 创建并直接用 IDE 打开
/git-worktree list                                 # 显示所有 worktree 状态
/git-worktree remove <path>                        # 删除指定的 worktree
/git-worktree prune                                # 清理无效 worktree 记录# 内容迁移
/git-worktree migrate <target> --from <source>     # 迁移未提交内容
/git-worktree migrate <target> --stash             # 迁移 stash 内容
重点：推荐使用这种指令而不是直接运行 git 命令的原因：不需要记住命令细节，只需要知道功能，然后用白话来执行指令，比如：
/git-worktree test 并打开
/git-worktree 加一个feat/add-i18n，删掉test分支和工作树
/git-worktree 把test2暂存区内容迁移到当前分支
而且不再局限于单个命令，可以白话直接执行多个复杂任务
推一个好用的 worktree vscode 插件：Git Worktree Manager - Visual Studio Marketplace
四、使用技巧
[图片]
众所周知，现在的AI生成的代码具有一定的随机性跟老虎机一样🤣，同样的提示词生成的代码质量也不一样，那么如何获取更高质量的代码呢？答：多线并行 + sl回档大法
- 多线并行：使用/git-worktree新建多个工作区，然后分别启动Claude Code，同时执行相同或不同的工作流指令完成同一个任务；最后比较结果选择最优的一个。
- sl回档大法：生成结果偏差太大，不建议继续让AI继续在其之上修改，可以分析下AI生成中遗漏或跑偏的内容，然后直接回滚，补充新的限制和上下文到最初的提示词中，提示词也可以是文档和图片

