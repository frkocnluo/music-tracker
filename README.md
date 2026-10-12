# SONIC RADAR · 跨时区与全语境音乐挖掘雷达

> **摆脱算法规训，重返一手声音。**  
> 一份专为硬核乐迷打造的实时音乐挖掘看板 —— 连接全球先锋地下与华语独立一线，摆脱社交媒体与流媒体算法的次级分发延迟。

**在线访问：<https://frkocnluo.github.io/music-tracker/>**

---

## 为什么需要 Sonic Radar？

作为音乐爱好者，在社交媒体上刷到 Pitchfork 的评分、各大年终总结或者视频乐评时，往往已经属于**第三手消息**：

1. **时效断层**：一张冷门前卫专辑从厂牌压盘，到被编辑排期试听、撰写乐评、再到社交媒体被各路博主搬运，往往已经过去了数周乃至数月。
2. **华语独立挖掘的结构性困境**：国内主流流媒体被算法神曲与商业买量榜单深度充斥，真正生猛的音乐人分散在 **StreetVoice（街声）** 的 Demo 区、**Bandcamp** 的小众厂牌、以及 **Freshmusic Awards** 的季度独立观察中，彼此割裂，难以一站式追踪。

**Sonic Radar** 将挖掘链路从“被动接收评价”推进到“源头与共识并网”：

```
【0手源 / 厂牌直发与独立摇篮】
  ├── StreetVoice 街声 (每日编辑推荐 & 飙升榜)
  ├── Bandcamp 华语地下厂牌 (SVBKVLT, 琪琪曲艺, 宜听 Eating Music)
  └── 先锋唱片店 (Boomkat, Bleep)
          ↓
【1手~1.5手 / 独立策展与硬核社群】
  ├── Bandcamp Daily (全品类深度发掘)
  ├── Freshmusic Awards (华语最中立民间乐评)
  └── The Quietus & The Wire (激进摇滚与声音艺术)
          ↓
【2手 / 权威乐评共识】
  ├── Pitchfork (Reviews & Best New Music)
  └── The Needle Drop / Anthony Fantano (YouTube 实时评测)
```

---

## 核心特性

- 💽 **Crate Digging 唱片仓美学**：深色工业/黑胶仓视觉设计，唱片封套悬停滑出旋转，极简高对比排版。
- 🌏 **跨语境双轨看板**：
  - **SINOPHONE INDIE（华语独立前线）**：街声新发、FMA 季选、Bandcamp 华语前锋。
  - **GLOBAL AVANT-GARDE（全球先锋地下）**：The Wire、Boomkat、Bandcamp Daily、The Quietus。
  - **CRITICAL PICKS（权威评鉴共识）**：Pitchfork 认证、Fantano Loved、RYM 榜单热度。
- ⚡ **零延迟即时试听 (Universal Player Dock)**：
  - 页面常驻底部黑胶试听底栏与动态频谱波形。
  - 遇到跨域或纯实体发售条目时，内置基于 **Web Audio API** 的环境泛音合成器平滑兜底，确保任意条目皆可交互发声。
  - 一键直达 **Bandcamp / 街声 / Spotify / 网易云** 原始流媒体或购买页。
- 📡 **自动化电波同步 (Live RSS Feed)**：
  - 内置极简流式 XML 解析器，直接对接各大官方 RSS/Atom 数据流，一键拉取最新百余篇评测与特写。
  - 配置 GitHub Actions 每 12 小时全自动爬取更新并静态部署。

---

## 技术架构

延续 **极简优雅、零运行时依赖（Zero-Dependency）** 理念：

- **无打包器、无前端框架黑盒**：纯原生 HTML5 语义结构 + 现代 Vanilla CSS 设计系统 + 原生 JavaScript。
- **纯 Node.js 生成器**：仅需 Node.js 18+ 原生 ESM 与 `fetch`，构建耗时 < 100ms。
- **免 CI 极速交付**：生成结果直接输出于根目录 `index.html`，原生契合 GitHub Pages 静态直连。

```
.
├── index.html                      # 最终看板页面（构建产物，免构建直接部署）
├── .nojekyll                       # 阻止 Jekyll 过滤下划线目录
├── assets/
│   ├── css/style.css               # 黑胶/暗色先锋设计系统
│   └── js/app.js                   # 客户端实时过滤、搜索与播放器交互
├── .github/workflows/
│   └── update-and-deploy.yml       # GitHub Actions 自动化定时抓取工作流
└── _build/                         # 构建源与抓取工具
    ├── sources.mjs                 # 拓扑信源定义（全球与华语渠道）
    ├── fetcher.mjs                 # 零依赖原生流式 RSS 解析器
    ├── data.mjs                    # 结构化精选唱片库
    ├── layout.mjs                  # HTML 模板组件
    ├── build.mjs                   # 静态页面构建器
    ├── serve.mjs                   # 本地快速预览服务器
    └── cache.json                  # 实时抓取的信源缓存数据
```

---

## 本地使用

本项目无需执行 `npm install` 安装任何庞大第三方依赖包：

```bash
# 1. 抓取最新信源数据（Pitchfork、Bandcamp、StreetVoice、Freshmusic 等）
node _build/fetch.mjs

# 2. 构建静态站点 index.html
node _build/build.mjs

# 3. 启动本地预览服务 (默认端口 4174)
node _build/serve.mjs
# 访问 http://127.0.0.1:4174
```

---

## 许可与鸣谢

- 网站代码采用 **MIT License**。
- 内容版权归各原作者、独立音乐人、厂牌及乐评机构（Pitchfork, The Wire, StreetVoice, Freshmusic, Bandcamp）所有，本站仅作信息聚合与试听引流。
