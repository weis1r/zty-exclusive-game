# 砖了个砖 H5 MVP

一个移动端优先的叠层点选三消小游戏，使用 `Vite + React + TypeScript` 实现。

## 当前内容

- 1 个完整可玩的单关卡
- 叠层遮挡判定
- 7 格收集槽与同类自动相邻整理
- 3 个相同砖块自动消除
- 胜利、失败、重新开始
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

- `src/App.tsx`: 页面状态、UI 结构和交互入口
- `src/game/engine.ts`: 纯游戏逻辑与状态变更
- `src/game/levels.ts`: 关卡配置
- `src/game/config.ts`: 全局配置和砖块主题
- `src/game/storage.ts`: 本地偏好存储
