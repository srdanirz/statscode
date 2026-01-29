# StatsCode

追踪你的 AI 编程时间、模式和成就。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🌐 [English](../README.md) • [Español](README.es.md) • [Português](README.pt.md) • [中文](README.zh.md)

## 什么是 StatsCode？

StatsCode 追踪你如何使用 AI 编程助手。可以把它想象成 **AI 辅助编程的 GitHub 统计**。

- **追踪时间** - AI 编程花费的时间
- **查看洞察** - 你的编程模式
- **云端同步** - 出现在排行榜上
- **添加徽章** - 到你的 GitHub 个人资料

## 支持的工具

| 工具 | 状态 |
|------|------|
| Claude Code | 可用 |
| OpenCode | 可用 |
| Codex | 即将推出 |
| Antigravity | 即将推出 |
| Cursor | 即将推出 |

## 快速开始

### Claude Code

```bash
# 通过市场安装
claude plugins install statscode

# 或手动安装
cd ~/.claude/plugins
git clone https://github.com/srdanirz/statscode
```

#### 命令

| 命令 | 描述 |
|------|------|
| `/statscode:stats` | 查看你的统计数据 |
| `/statscode:insights` | 查看会话模式 |
| `/statscode:login` | 使用 GitHub 登录 |
| `/statscode:badge` | 查看你获得的徽章 |

### OpenCode

添加到你的 `opencode.json` ([文档](https://opencode.ai/docs/plugins/)):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@statscode/plugin-opencode"]
}
```

插件会在启动时通过 Bun 自动安装。

## 追踪内容

- **活跃时间** - 编程时间（基于活动）
- **会话数** - 会话数量
- **提示数** - 发送的提示总数
- **生成行数** - 编写/编辑的代码
- **语言** - 使用的编程语言

## 在 GitHub 个人资料添加徽章

使用 `/statscode:login` 登录后：

```markdown
[![StatsCode](https://api.statscode.dev/badge/你的用户名.svg)](https://statscode.dev/profile/你的用户名)
```

## 隐私

- 所有数据默认**本地存储** (`~/.statscode/`)
- 云端同步是**可选的**
- 不上传任何提示或代码
- 只同步聚合统计数据

## 开发

```bash
git clone https://github.com/srdanirz/statscode
cd statscode
npm install
npm run build
```

## 许可证

MIT
