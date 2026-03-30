Original prompt: 帮我优化一下关卡难度

TODO
- 评估当前默认关卡的实际体感难度和可解空间。
- 调整关卡排布或参数，让早期决策空间更大、容错更高，同时保留挑战性。
- 跑自动化试玩、测试、构建和 lint 验证。

Notes
- 默认关卡当前标记为 `hard`，共 36 块，开局仅暴露 6 块，可解路径较窄。
- 已将默认关卡调整为 `normal`，保留 36 块和 7 格槽位，但把顶层改成 `3 个焰 + 3 个叶`，让玩家开局就能完成两次安全三消。
- 新增 `window.render_game_to_text`，自动化可直接读取当前状态、收集槽和可点击砖块。
- 自动化验证:
  - `state-0.json` 确认开局暴露牌为 `ember x3` 和 `leaf x3`。
  - 实机点击验证后，清掉两组三消会展开完整中层 9 张牌，节奏更平滑。
  - `npm run test` / `npm run build` / `npm run lint` 全部通过。

Suggestions
- 如果还想继续降难度，可以优先考虑给中层再增加一个可立即配对的三连，而不是放宽收集槽容量。
- 如果想保留现在的普通难度，再补一关 `hard` 会比把唯一默认关卡重新拉难更合理。

---

Task
- 用户新需求: 帮我用 subagent 一个负责策划, 一个开发, 一个测试, 一个美术, 帮我开发一个砖了个砖这个游戏。

What changed
- 已整合 4 个 subagent 的方案，落地为战役版 `砖了个砖`：
  - 战役首页 / 关卡卡片 / 解锁链路
  - 本地进度存储与星级记录
  - 局内提示 / 撤销辅助
  - 更完整的通关 / 失败弹窗
- `GameApp` 现在支持注入自定义战役定义，便于测试和后续扩关。
- `levels.ts` 的战役查询 helper 已支持传入自定义战役，不再只绑定默认战役。
- 新增并更新自动化测试：
  - `src/App.test.tsx` 改为覆盖战役流、提示、撤销、解锁、失败重试
  - `src/game/engine.test.ts` 新增提示与撤销测试
  - `src/game/storage.test.ts` 新增进度存储与关卡 helper 测试
- 为自动化试玩补上了 `window.advanceTime` fallback，并保留 `window.render_game_to_text`。
- 本地安装了 `playwright` 作为开发依赖，便于继续用技能脚本做截图和状态巡检。

Verification
- `npm run build`
- `npm run test -- --run`
- `npm run lint`
- 技能脚本试玩:
  - `output/web-game/campaign/shot-0.png`
  - `output/web-game/level-1/shot-0.png`
  - 对应 `state-0.json` 已确认首页与进关状态一致
- 浏览器人工补测:
  - 进入第 1 关
  - 点掉 1 张焰砖后，撤销按钮可用
  - 提示会高亮推荐砖块并扣减次数
  - 撤销会恢复棋盘与收集槽
  - 连续消掉 3 张焰砖后，收集槽清空并展开下一层
  - 返回地图按钮可正常回到战役页

Open notes
- `render_game_to_text` 在 `view === 'campaign'` 时仍会携带上一局的局内数值，但已明确包含 `view` 字段；如果后面要做更强的自动化代理，可继续把它收敛成“仅输出当前屏幕相关状态”。
- 当前战役为 3 关版本，已经够做 v1；如果下一轮继续扩内容，优先补第 4-6 关、章节包装和更明显的通关奖励反馈。

---

Task
- 用户新需求: 帮我开发一个新版本, 并且 subagent 都切到 gpt5.4 这个模型。

V2 scope
- 这轮把游戏升级为 `v2` 战役版：
  - 从 3 关扩展到 6 关
  - 引入 2 个章节与章节卡片总览
  - 新增章节级进度记录 `chapterRecords`
  - 战役首页升级为「总览 + 章节焦点 + 分章节关卡列表」
  - 通关结算会提示“解锁下一关 / 新章节 / 战役完成”

What changed
- `src/game/levels.ts`
  - 重构为数据驱动关卡定义，增加了 6 个正式战役关卡
  - 增加章节元数据与查询 helper
- `src/game/storage.ts`
  - 按 `CampaignProgress.version = 2` 重建存储逻辑
  - 兼容读取旧版 `version = 1`
  - 新增 `currentChapterId` 和 `chapterRecords`
- `src/App.tsx`
  - 升级战役首页结构，支持章节总览、章节焦点、分章节关卡组
  - `render_game_to_text` 现在会输出章节级摘要，便于自动化代理
  - 通关弹窗会根据推进结果提示章节/关卡解锁信息
- `src/App.css`
  - 增加章节总览、章节焦点、章节分组关卡列表的样式
- 测试
  - `src/App.test.tsx` 新增章节总览渲染测试
  - `src/game/storage.test.ts` 新增 `version=2` 与 `chapterRecords` 断言

Verification
- `npm run build`
- `npm run test -- --run`
- `npm run lint`
- 技能脚本截图与状态：
  - `output/web-game/v2-campaign/shot-0.png`
  - `output/web-game/v2-campaign/state-0.json`
  - `output/web-game/v2-level/shot-0.png`
  - `output/web-game/v2-level/state-0.json`
- 已确认：
  - 首页显示 6 关 / 2 章
  - 章节总览和章节焦点正常
  - 进入第一关后 HUD、棋盘和收集槽正常

Open notes
- 这轮因为并行线程里出现了旧 agent 残留和中途文件写入，我在主线程做了最终集成与收口；后续如果继续做 v2.1，建议把“每日挑战 / 章节完成奖励 / 更明确的终章动画”作为下一批。

---

Follow-up polish
- 额外补了一轮交付前收口：
  - `index.html` 改成正式标题 `砖了个砖：花园远征`，不再显示模板名 `temp-app`
  - `src/game/engine.test.ts` 新增“全部正式战役关卡可解”回归测试
  - `src/game/storage.test.ts` 新增旧版 `brick-match:campaign-progress` 向章节制 `version=2` 的迁移测试

Extra verification
- 再次执行：
  - `npm run test -- --run`
  - `npm run lint`
  - `npm run build`
- 自动化与人工补测：
  - Vite 本地预览: `http://127.0.0.1:4176/`
  - 技能脚本产物:
    - `output/web-game/v2-campaign-20260319/shot-0.png`
    - `output/web-game/v2-campaign-20260319/state-0.json`
    - `output/web-game/v2-level-1-20260319/shot-0.png`
    - `output/web-game/v2-level-1-20260319/state-0.json`
  - 浏览器实测确认：
    - 战役首页显示 `6` 关、`2` 章、章节总览与章节焦点正常
    - 进入第 1 关后，局内 HUD / 棋盘 / 收集槽状态正确
    - 点击 1 张焰砖后，撤销按钮会启用，文本状态同步为 `selectedCount=1`
    - 使用提示后会高亮推荐焰砖并消耗 1 次提示
    - 使用撤销后会恢复到开局状态并消耗 1 次撤销
    - 返回地图后，`render_game_to_text` 会重新回到 `view=campaign`
  - 引擎级探测：
    - 6 个正式战役关卡都能被当前规则搜索出通关路径

Remaining risk
- 目前“可解”已经有自动化保证，但 `level 4-6` 的玩家主观体感仍主要依赖当前推荐步数与辅助道具配置；如果继续做 v2.1，建议补一轮更偏策划向的手感微调。

---

Task
- 用户新需求: 把项目升级成“朱天宇专属游戏 v2.2”，改成章节卡通头像驱动的专属版本，并推送到远端主分支。

V2.2 scope
- 这轮不改玩法、存档、关卡解法，只升级表现层与用户可见命名：
  - 主名称统一为 `朱天宇专属游戏`
  - 保留 `花园远征` 作为世界观副标题
  - 首页、章节区、结算弹窗改为“章节头像驱动”视觉
  - 局内只保留小型章节徽章，避免遮挡棋盘操作

What changed
- 命名统一
  - `index.html` 标题改为 `朱天宇专属游戏`
  - 顶部主标题改为 `朱天宇专属游戏`，`花园远征` 作为副标题保留
  - 默认战役显示名改为 `朱天宇专属游戏`
  - `README.md` 标题与说明同步更新
  - `package.json` / `package-lock.json` 包名改为 ASCII 安全的 `zty-exclusive-game`
- 头像化美术
  - 新增本地 SVG 章节头像：
    - `src/assets/avatar-bloom-scout.svg`
    - `src/assets/avatar-mirror-guide.svg`
  - 新增本地装饰 SVG：
    - `src/assets/spark-ribbon.svg`
    - `src/assets/garden-sticker-pack.svg`
  - `src/App.tsx` 新增本地 `CHAPTER_AVATAR_THEMES` 映射，把头像、角色名和章节色绑定到章节 `id`
  - 首页 hero 改成“左文案 + 右头像”布局
  - 章节总览卡、章节焦点区、结算弹窗接入章节头像
  - 局内章节条增加小头像徽章，但没有把大头像放进棋盘区
- 视觉系统
  - `src/App.css` 重写为更鲜亮的头像驱动风格，强化章节卡、海报卡、奖励卡和 CTA 层次
  - 砖块主题继续保留“物件感”，并在 `TileTheme` / `TILE_THEMES` 中扩展了 `badge`、`outline`、`pattern` 展示字段，供砖块、收集槽和爆发反馈共用
- Git 收口
  - 在本地工作分支 `codex/app-zty-avatar` 上完成本轮改动
  - 将 `output/` 加入 `.gitignore`，避免截图与状态产物误入版本库

Verification
- 自动化检查：
  - `npm run test -- --run`
  - `npm run lint`
  - `npm run build`
- 结果：
  - 3 个测试文件、22 个测试全部通过
  - lint 通过
  - build 通过
- 视觉与交互巡检：
  - 技能脚本产物：
    - `output/web-game/zty-campaign-final-20260322/shot-0.png`
    - `output/web-game/zty-campaign-final-20260322/state-0.json`
    - `output/web-game/zty-level-final-20260322/shot-0.png`
    - `output/web-game/zty-level-final-20260322/state-0.json`
  - 浏览器人工补测：
    - 首页已显示 `朱天宇专属游戏` 主标题与右侧章节头像
    - 第 1 关可正常进入，头像层未遮挡棋盘和按钮
    - 按已知通关路径完成第 1 关后，结算弹窗会显示头像贴纸、奖励信息和下一关 CTA

Open notes
- 头像采用原创通用角色头肩像，不依赖外部图片或真人照片资源。
- 当前首页主视觉刻意偏手游活动海报风格；如果后续还想继续压缩信息密度，可以优先再收一点 hero 的高度，而不是删掉章节头像。
- 代码层改名与应用显示名已全部完成。

Delivery outcome
- 本地提交:
  - `0297312 feat: ship zty exclusive game v2.2`
- 已推送到远端:
  - `origin/main` -> `0297312`
- GitHub 仓库已从 `weis1r/0313gametest` 改名为 `weis1r/zty-exclusive-game`
- 本地 remote 已更新为:
  - `https://github.com/weis1r/zty-exclusive-game.git`

Next suggestions
- 如果后面继续做“专属感”增强，优先方向可以是：
  - 让章节头像在完成整章时解锁一条专属祝贺文案
  - 给首页 hero 增加按章节切换的轻量过场
  - 再补一轮移动端真机字号与间距微调

---

Task
- 用户新需求: 在 `codex/app-vita-table-refresh` 基线上创建 `美术表现222` 分支，把项目重构成严格三屏 `首页 -> 游戏页 -> 结果页`，并加强 Vita 风格美术表现。

What changed
- 已从干净基线创建独立 worktree / 分支 `美术表现222`，避开旧分支未提交改动。
- 将巨型 `App.tsx` 拆为三屏结构：
  - `src/screens/HomeScreen.tsx`
  - `src/screens/GameScreen.tsx`
  - `src/screens/ResultScreen.tsx`
  - `src/screens/screen-types.ts`
  - `src/components/TilePiece.tsx`
- `App.tsx` 页面状态改为 `home | game | result`，并新增独立 `RoundSummary` 结果态。
- 首页收口为单入口：
  - 只保留 logo、当前关卡入口、右上角设置
  - 去掉首页头像 / 资源条等无关包装
  - CTA 固定为 `关卡 N`
- 游戏页保留局内 HUD、顶部四槽、棋盘、底部道具区，并保留返回确认、提示、撤销。
- 结果页改为独立整页，不再是弹窗；末关主按钮固定为 `再来一次`，次按钮为 `返回首页`。
- `src/App.css` 已按三屏重整，并补了更统一的木质 / 和风 / 台面质感、入场动效、提示高亮动效和 `prefers-reduced-motion` 兼容。
- `src/App.test.tsx` 已对齐三屏流转，并补了：
  - 首页单入口断言
  - 末关胜利主按钮断言
  - 中途退出确认取消时留在游戏页

Pending verification
- 待执行 `npm run test`
- 待执行 `npm run lint`
- 待执行 `npm run build`
- 待做本地预览与三屏交互巡检

Verification
- 依赖
  - 在新 worktree 执行了 `npm install`
- 自动化检查
  - `npm run test -- --run`
  - `npm run lint`
  - `npm run build`
- 结果
  - 3 个测试文件、30 个测试全部通过
  - lint 通过
  - build 通过
- 自动化与视觉巡检
  - `develop-web-game` 客户端产物：
    - `output/web-game/meishu222-home/shot-0.png`
    - `output/web-game/meishu222-home/state-0.json`
    - `output/web-game/meishu222-game/shot-0.png`
    - `output/web-game/meishu222-game/state-0.json`
  - Playwright MCP 实机巡检：
    - 首页确认只保留 logo、当前关卡文案、单入口 CTA、右上角设置
    - 游戏页确认 HUD / 顶部四槽 / 棋盘 / 底部道具区层次正确
    - 用真实贪心通关路径手动点完第 1 关，结果页成功展示 `关卡 2` 主按钮与 `返回首页` 次按钮
    - 从结果页回首页后，首页入口已自动推进到 `关卡 2`

Notes
- `develop-web-game` 客户端在点击首页 CTA 时会受入场动画稳定性判定影响，产出的 `meishu222-game/state-0.json` 仍停留在首页；后续我已用 Playwright MCP 实机点击补完游戏页与结果页验证。

Task
- 用户新需求: 这个能不能再优化一下, 改成写实版本的 icon

What changed
- 局内砖块 icon 从偏 Q 版表情头像继续往“半写实手游立绘头像”方向重做:
  - `src/App.tsx`
    - 重绘 tile mascot 的眼睛、眉形、鼻梁和嘴唇，减少大眼和卡通腮红
    - 增加脸部明暗层次，让头像更像小型人像插画而不是贴纸表情
    - 弱化爆发态的夸张星星眼，改成更克制的高光/闪烁表现
    - 调整肩颈、衣领和头像缩放，让头肩比例更接近手游 portrait icon
    - 缩小头饰体积，降低“玩具感”
  - `src/App.css`
    - 降低 tile 高光和倾斜幅度，减少塑料糖果卡质感
    - 压低 mascot 的旋转、缩放和 hover 幅度，让 icon 更稳重

Verification
- `npm run lint`
- `npm run build`
- `npm run test -- --run`
- 浏览器截图复看:
  - 第 3 关局内 icon 已从偏搞笑卡通脸收窄到更偏半写实头像风格
  - 棋盘点击、提示、撤销、返回地图等交互未受影响

Open notes
- 受限于目前仍是 inline SVG 小尺寸头像，这一版更接近“半写实手游 icon”，不是照片级写实。
- 如果下一轮还想继续压“写实感”，优先方向应是：
  - 进一步重做发型/头饰轮廓，减少可爱装饰
  - 把 tile 右上角徽记再弱化一档
  - 为 5-6 个常用 tile 单独画更成熟的人物轮廓，而不是共用同一套头肩结构

---

Follow-up polish
- 用户追加要求：棋盘砖块不要再用汉字做主视觉，而是换成更有趣的卡通头像。
- 已在 `src/App.tsx` 新增统一的 `TileMascot` 头像组件：
  - 棋盘砖块改成头像卡面
  - 收集槽砖块改成头像缩略卡面
  - 三消爆发反馈也复用同一套头像表现
- 本轮没有改动关卡、存档或数值逻辑，只替换了砖块 UI 表现。
- `src/App.css` 同步调整了砖块卡面布局，移除了原本依赖 `label/title` 的大字展示。

Extra verification
- `npm run test -- --run`
- `npm run lint`
- `npm run build`
- 自动化截图：
  - `output/web-game/zty-avatar-campaign-20260322/shot-0.png`
  - `output/web-game/zty-avatar-level-20260322/shot-0.png`
- 人工核对结论：
  - 第 1 关棋盘顶层砖块已显示为卡通头像，不再出现“焰/叶”等大字
  - 收集槽和棋盘点击区域未受影响

---

Task
- 用户新需求: 游戏难度太高了, 帮我降低下难度, 颜色减少一点, 然后完成任务之后重新提交分支, 再重新推送到 CloudBase。

WIP plan
- 通过减少每关同时出现的砖块类型来同时降低难度和减少颜色数量。
- 统一把层叠 36 砖关改成“前六块就是两组三连”的温和起手结构。
- 提高各关卡的 `startingAssists`，并放宽推荐步数与星级阈值。
- 验证所有正式关卡仍然可解，再进行提交、合并和 CloudBase 发布。

What changed
- `src/game/levels.ts`
  - 新增 `createGentleStackTypes`，把所有 36 砖层叠关统一改成“双三连起手 + 四色以内”的温和结构。
  - 第 2 关改成仅 3 种砖块类型的 27 砖台阶局。
  - 第 1-3 关改为 `easy`，第 5-6 关从 `hard` 下调为 `normal`。
  - 全部关卡提升 `startingAssists`，并放宽推荐步数与星级阈值。
- `src/game/engine.test.ts`
  - 默认关卡断言同步改为 `easy`。
  - 新增“正式关卡最多 4 种砖块类型”的回归测试。
  - 默认关卡通关验证改为动态搜索可行路径，避免路径写死后和新编排脱节。

Verification
- `npm run test -- --run`
- `npm run lint`
- `npm run build`
- 技能脚本截图：
  - `output/web-game/difficulty-tune-20260322/campaign/shot-0.png`
  - `output/web-game/difficulty-tune-20260322/level-1/shot-0.png`
- 浏览器实测：
  - 首页关卡文案已体现“更少颜色 / 更稳起手”。
  - 第 1 关开局只露出两组三连。
  - 连点 3 张焰砖后，收集槽会立即清空，下一批暴露砖块依然控制在少量颜色内。

---

Follow-up art direction
- 用户要求不要直接使用现成 IP 头像，改成“蜡笔小新致敬感”的原创卡通人物风格。
- 已完成两层统一：
  - `src/assets/avatar-bloom-scout.svg` 与 `src/assets/avatar-mirror-guide.svg` 重画为幼稚园蜡笔贴纸感的原创章节头像
  - `src/App.tsx` 的 `TileMascot` 改成更粗描边、夸张眉眼、贴纸式小朋友头像
- `src/App.css` 同步补了头像外框、轻微倾斜和更像手工作品贴纸的阴影与描边。

Extra verification
- `npm run test -- --run`
- `npm run lint`
- `npm run build`
- 自动化截图：
  - `output/web-game/zty-tribute-campaign-20260322/shot-0.png`
  - `output/web-game/zty-tribute-level-20260322/shot-0.png`
- 人工核对结论：
  - 首页主头像已从“精致 Q 版”切到“蜡笔涂鸦贴纸感”原创角色
  - 棋盘顶层砖块仍保持纯头像表达，没有恢复文字主视觉

---

Follow-up humor polish
- 用户要求把局内头像继续往“更搞笑、更欠、更有戏”方向拉，但不走抽象怪诞路线。
- 已完成局内范围的统一升级：
  - `TileMascot` 增加固定的 `mood` 表情体系：`board-active` / `board-blocked` / `board-hinted` / `tray` / `burst`
  - 棋盘可点击砖改成更欠揍的夸张表情
  - 被遮挡砖改成斗鸡眼 / 压扁感的呆滞状态
  - 收集槽砖改成紧张冒汗表情
  - 三消爆发改成星星眼 + 大笑庆祝表情
- 局内章节头像不再复用首页正经头像：
  - 顶部章节条改成局内专用搞笑头像
  - 结算弹窗根据胜负切换成“庆祝版 / 崩溃版”头像
- 首页、章节总览、章节焦点区头像保持原样，本轮未改。

Verification
- 自动化检查：
  - `npm run test -- --run`
  - `npm run lint`
  - `npm run build`
- 技能脚本截图：
  - `output/web-game/humor-campaign-20260322/shot-0.png`
  - `output/web-game/humor-level-start-20260322/shot-0.png`
- 人工补测截图：
  - `/tmp/tray-humor-20260322.png`
  - `/tmp/result-humor-20260322.png`
- 核对结果：
  - 开局棋盘的可点击砖与被遮挡砖已经是不同表情
  - 收集槽头像和棋盘头像表情明显不同
  - 结算弹窗头像已切成局内专用搞笑版，不再复用首页头像

---

Task
- 用户新需求: 继续优化美术，重点解决“局内各个颜色太相近”的问题。

What changed
- `src/game/config.ts`
  - 重新拉开 9 类砖块的主色、描边和阴影差异，重点把 `leaf / pine`、`cloud / shell / wave` 这几组原本接近的色相彻底拆开。
  - 保留原有 `badge` 字段，并把底纹改得更有各自类型特征。
- `src/App.tsx`
  - 新增 `TileThemeBadge`，给棋盘砖块、收集槽砖块、三消爆发砖块都加了图形角标，不用汉字也能更快辨识类别。
  - 调整 `TILE_MASCOT_SPECS`，让每类头像的头发色和辅色也跟着拉开，不再像“同一组角色换衣服”。
- `src/App.css`
  - 棋盘外框和内板改成更深的紫蓝舞台底，降低底板对暖色砖块的干扰。
  - 砖块卡面加强双色渐变、底部压色、内边框和高对比描边。
  - 新增角标样式，并增强 blocked 状态的降饱和表现。

Verification
- `npm run test -- --run`
- `npm run lint`
- `npm run build`
- 技能脚本截图：
  - `output/web-game/color-pass-20260323/campaign/shot-0.png`
  - `output/web-game/color-pass-20260323/level-1/shot-0.png`
- 核对结果：
  - 第 1 关顶层橙色与绿色砖块的区分已经明显拉开。
  - 深色棋盘底让卡面更突出，不再和奶白底混在一起。
  - 小图形角标能辅助识别，不会把视觉又拉回文字化。

---

Task
- 用户新需求: 当前版本太简单，希望稍微复杂一点，并把战役扩展到 20 关；要求新起 `0323` 版本分支，最后合并回 `main` 并推送到 CloudBase。

What changed
- `src/game/levels.ts`
  - 从手写 6 关重构为蓝图驱动的 20 关战役配置。
  - 保留旧的前 6 关 id，继续顺延扩展到第 20 关，避免旧版本引用失效。
  - 战役扩展为 5 个章节：`3 + 3 + 4 + 5 + 5` 关。
  - 起手难度从“默认双三连”调整成“多数关只有一组三连或两组对子”，整体回到更需要思考一步的节奏。
- `src/App.tsx`
  - 补了第 3-5 章的头像主题与局内头像配色。
  - 首页规则条改成动态文案，不再写死“六关双章节”。
- `src/game/storage.ts`
  - 旧存档如果已经打通原来的第 6 关，会在加载时自动解锁第 7 关，接上新战役链路。
- `src/game/engine.test.ts` / `src/game/storage.test.ts`
  - 增加 20 关 / 5 章的回归约束。
  - 默认关卡断言同步改为“一组三连 + 两个 setup 砖”的新版起手。

Verification
- `npm run test -- --run`
- `npm run lint`
- `npm run build`
- 技能脚本截图：
  - `output/web-game/v0323-20260323/campaign/shot-0.png`
  - `output/web-game/v0323-20260323/level-1/shot-0.png`
- 浏览器实测：
  - 首页已显示 `20` 关、`5` 个章节。
  - 第 1 关进入后顶层不再是双三连白送，而是 `焰 x3 + 叶 x2 + 花 x1` 的较温和开局。

---

Task
- 用户新需求: 继续优化美术表现，重点处理“棋盘铺满屏幕、去掉红色涂层、牌面更错落、修复消除后托盘多出格子”的问题，并最终推送 `美术表现222` 分支。

What changed
- `src/game/levels.ts`
  - 把 `STACK_36_SLOTS` 恢复到原本通过可解性验证的稳定坐标，避免因为几何改动破坏开局暴露数和第 19 关可解路径。
  - 保留更紧凑的 `boardWidth: 356` / `boardHeight: 450`，让同一套稳定牌阵在新 Vita 界面里占比更满。
- `src/screens/GameScreen.tsx`
  - 保留“消除爆发贴在槽位内部”的实现，修复配对动画期间把托盘撑成第二排的问题。
  - 给棋盘砖块增加轻量、确定性的视觉错落偏移和小角度旋转，但只作用于牌面视觉层，不移动真实按钮 hitbox。
- `src/App.css`
  - 继续沿用本轮三屏 Vita 风格，保持已移除的旧涂层背景不回归。
  - 把棋盘砖块的视觉尺寸放大到 `78 x 100`，但按钮点击框维持 `72 x 92`，既提升铺满感，也避免叠牌后点击被错误拦截。
- `src/App.test.tsx`
  - 新增“配对爆发时托盘仍固定 4 格”的回归测试，防止再次出现消除后多出一排空槽。

Verification
- 全量自动化:
  - `npm run test -- --run`
  - `npm run lint`
  - `npm run build`
- 浏览器实测:
  - 本地 Vite: `http://127.0.0.1:4190/`
  - 已确认首页、游戏页、结果流转正常。
  - 已确认两张同类牌配对后，托盘仍保持单行 `4` 槽，不会再冒出第二排虚线格。
  - 已确认棋盘牌面更满、更有轻微错落感，同时仍能正常点选推进。

Open notes
- 当前“错落感”是渲染层微偏移，不改真实解法几何；这是为了同时满足美术自然度和 20 关可解性约束。
- Playwright 验证时，部分被上层压住中心点的可点击牌需要点击其实际露出区域，这是叠牌玩法本身允许的情况；主流程中的可点牌与托盘行为都已复测通过。
