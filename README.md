# 朱天宇专属游戏

一个移动端优先的叠层点选三消小游戏，采用 `Vite + React + TypeScript` 实现，当前包装为“朱天宇专属游戏 · 花园远征”主题版本。

## 当前内容

- 6 个正式战役关卡与 2 个章节
- 叠层遮挡判定
- 7 格收集槽与同类自动相邻整理
- 3 个相同砖块自动消除
- 胜利、失败、重新开始与章节推进
- 本地保存音效开关偏好
- 单元测试与交互测试

## 本地运行

```bash
npm install
npm run dev
```

## 验证命令

```bash
npm run test
npm run build
npm run lint
```

## 目录说明

- `src/App.tsx`: 页面状态、UI 结构、头像表现和交互入口
- `src/game/engine.ts`: 纯游戏逻辑与状态变更
- `src/game/levels.ts`: 关卡配置
- `src/game/config.ts`: 全局配置和砖块主题
- `src/game/storage.ts`: 本地偏好存储
