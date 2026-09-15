# 归核 / Relic Return

独立 Three.js 第三人称小型遗迹冒险。四个房间、一个岔路、钥匙开门、守卫战斗、周期陷阱、单物品槽、核心返回交付。三个阶段共用世界与操作：Ⅰ 关闭陷阱，Ⅱ 开启陷阱，Ⅲ 缩短守卫前摇并提高伤害。每局最多五分钟。

## 本地运行

Node.js 22.12+。在本目录运行 `npm ci`、`npm run dev`，打开 http://127.0.0.1:9143/ 。`npm run check` 执行自动测试及生产构建。

WASD 相对镜头移动，拖动鼠标或方向键调整镜头，空格跳跃，左键单击或 J 攻击，Shift 闪避，E 交互，Esc 暂停。失焦和切后台自动暂停。结算可重开并导出 JSON 事件记录。

## 部署：与 apex-rush 相同

独立 Vite 静态项目，使用 Cloudflare Workers Builds。项目根目录选择 `relic-return`；安装 `npm ci`；部署命令 `npx wrangler deploy`。Wrangler 的 `build.command` 自动执行 `npm run build`，`assets.directory` 固定 `./dist`，Worker 名为 `relic-return`。这里提供部署配置，尚未发布远端 Worker。

- `BASE_PATH=/`（默认）发布根路径。
- 构建环境设置 `BASE_PATH=/relic-return/`，站点整体输出到 `dist/relic-return/`。
- `_headers` 始终位于 `dist/_headers`；规则自动加相同前缀，对 `playweft.json` 和 `featured-games.json` 开启 CORS 并禁用缓存。
- Vite 资源地址和生成的 manifest.id 使用相同前缀。图标、帮助页、入口和游戏目录使用相对 URL。
- 每次构建清空 dist，切换路径无旧文件残留。不要将 Cloudflare 上传目录改为嵌套子目录。
- `.env.example` 提供示例，可复制为 `.env`；生产构建也读取环境变量。

Playweft 导入游戏根 URL 或其 `playweft.json`。复用赛车游戏的标准 MessageChannel solo bridge，不声明多人模式。

## 统一动作与后续模型接入

`src/game.js` 是与渲染分离的确定性 60Hz 模拟；人类输入和模型接口调用同一个 `step`。阶段只调整配置，不切换世界或动作空间。本项目不包含已训练模型或训练管线。

浏览器中的 `window.relicReturn` 提供：

```js
relicReturn.reset({ level: 2 }); // 进入手动步进模式，实时模拟停止
relicReturn.actionSchema;
relicReturn.act({ moveY: 1 }, 60); // 相机相对前进一秒，返回观察
relicReturn.act({ interact: true }, 1);
relicReturn.act({}, 1); // 松开按键，下一次才能重新触发
relicReturn.observe();
relicReturn.resumeHuman(); // 恢复人类实时操作
```

`act(action, frames)` 每次限制 1–600 步。移动 X/Y 范围 [-1,1]；lookX/lookY 为每步弧度增量，分别限制 ±0.15/±0.1；jump/attack/dodge/interact 是上升沿触发。相机 yaw=0 时前进指向世界 -Z。模型与人类享受相同速度、伤害、冷却及交互条件。暂停期间不推进；重置可恢复运行。

观察是只读副本，包含生命、位置、镜头、物品、敌人阶段、目标、伤害分类及带时间的事件。该结构化观察是调试特权信息；研究纯视觉模型时应使用画面输入，仅用事件记录评估。不会将不同训练阶段切换成不同规则引擎。

## 验证与边界

七项自动测试覆盖：按真实移动动作完成完整任务、封印阻挡、钥匙消耗、攻击触发、陷阱/跳跃/闪避/跌落、失败冻结、确定性、子路径规范和 `_headers` 重定位。已验证实际根路径与子路径构建，并打开浏览器确认场景及开始交互。

第一版为程序生成低多边形美术，无外部素材。平面房间和宽桥使用轻量移动规则，装饰柱与帐篷不参与碰撞，镜头未做遮挡回避；没有复杂背包、装备、对话或训练模型。当前针对桌面键鼠，尚未加入手机触控操作或进行长期真人难度调校。
