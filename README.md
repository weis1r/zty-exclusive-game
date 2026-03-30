# 朱天宇专属游戏

一个移动端优先的叠层点选二消小游戏，采用 `Vite + React + TypeScript` 实现，当前包装为“朱天宇专属游戏 · 花园远征”主题版本。

## 当前内容

- 20 个正式战役关卡与 5 个章节
- 叠层遮挡判定
- 顶部 4 格配对槽
- 顺序入槽，只有相邻成对头像才会消除
- 胜利、失败、重新开始与章节推进
- 本地保存音效开关偏好
- 单元测试与交互测试
- Android 原生壳工程

## 本地运行

```bash
npm install
npm run dev
```

## Android 版本

项目现在附带一个 Android 原生容器工程，目录位于 `android/`。实现策略是保留现有网页游戏逻辑，用 `WebView + WebViewAssetLoader` 直接加载 App 内置的离线资源。

准备 Android 资源：

```bash
npm install
npm run android:prepare
```

然后用 Android Studio 打开 `android/` 目录，即可运行或继续打包 APK。

建议环境：

- Android Studio 最新稳定版
- JDK 17
- Android SDK Platform 35

当前这台工作站缺少 Java 和 Android SDK，所以我已经把 Android 工程代码搭好，但还不能在本机直接完成 APK 编译校验。

## 验证命令

```bash
npm run test
npm run build
npm run lint
npm run android:prepare
```

## 目录说明

- `src/App.tsx`: 页面状态、UI 结构、头像表现和交互入口
- `src/game/engine.ts`: 纯游戏逻辑与状态变更
- `src/game/levels.ts`: 关卡配置
- `src/game/config.ts`: 全局配置和砖块主题
- `src/game/storage.ts`: 本地偏好存储
- `android/`: Android 原生外壳工程
- `scripts/sync-android-assets.mjs`: Android 静态资源同步脚本
