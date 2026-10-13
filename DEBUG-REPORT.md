# SONIC RADAR · 完整 Debug 报告与工作原理优化方案

**日期**：2026-10-14　**范围**：`_build/`（6 个模块 + 新增 1 个）、`assets/js/app.js`、`assets/css/style.css`、`.github/workflows/`、`README.md`
**方法**：静态通读 → 代码级验证 → **实网抓取复现** → **真实浏览器（CDP）交互回归** → 修复 → 回归对比

---

## 0. 结论先行

| | 修复前 | 修复后 |
| --- | --- | --- |
| 配置信源 / 真实可用 | 7 / **5**（The Wire 配了但无 feedUrl → 静默跳过；Boomkat 无订阅接口却当信源算） | 7 / **6**（5 在线 + 1 策展位，如实标注） |
| 数据条目 | 115 | **159**（渲染 149，去重 10） |
| 真实可试听 | **0 / 115**（播放器 100% 是合成器假音） | **15**（YouTube 内嵌，真播） |
| 出版方标签覆盖 | 0 / 115 | **109 / 159** |
| 跨源重复卡片 | 6 组（同专辑出现两次） | **0**（合并为 9 条多源共识） |
| 艺人名可信度 | 硬编码名单 + slug 对半砍，实测产出 "Greg Freeman All Set"、"Emily a Sprague" | verified 26 / high 112 / guessed 1 / unknown 10 |
| 流派可筛选性 | 76/115（66%）落入无 pill 的 `Alternative / Digging`，**筛不到** | 动态 pill 覆盖全部桶，最大桶 45 |
| 评分 pill 有效率 | RYM/AOTY/TND 在 **115 中的 112** 上恒为 `-`；BNM 高亮永不触发 | 移除无效 pill，改为可核验的「多源共识」 |
| 单轮抓取失败后果 | **整源数据被清空**（实测 115 → 40 条） | 保留上次成功快照 + 标注降级 |
| CI 自动化 | workflow 放错目录，**从未执行过** | 落位 `.github/workflows/`，含并发锁与摘要 |
| 本地服务目录穿越 | **可利用**（实测读到项目外文件，HTTP 200） | 已封堵（403/404） |
| 浏览器运行时 | — | 未捕获异常 0 / console error 0 / 资源失败 0 |
| index.html | 613,074 B（gzip 43,192 B） | 495,647 B（gzip 39,659 B），**每实体 DOM 元素 43.4 → 38.5** |

> 关键修正：**这个项目的原始形态不是"有几个 bug"，而是"几条主链路实际上没有在工作"** —— 抓取会在部分失败时毁掉数据、自动化从未运行、试听是假的、The Wire/Boomkat 是摆设、66% 的内容筛不到、播放器外链与评分条大半是装饰。以下逐条给出证据。

---

## 1. P0 · 数据安全级缺陷

### 1.1 部分信源失败 = 全量缓存被清空

**现象**：执行一次正常的 `node _build/fetch.mjs`，缓存从 **5 源 / 115 条**变成 **2 源 / 40 条**。

```
BEFORE: 115 items / 5 srcs
⚠️ [SKIP] The Quietus HTTP 403
⚠️ [TIMEOUT/SKIP] Bandcamp Daily: fetch failed
⚠️ [TIMEOUT/SKIP] Stereogum: This operation was aborted
✅ Pitchfork: 30 条 ; ✅ Fantano: 15 条
🎉 同步完成！封面与数据已持久化
AFTER: 2 srcs / 40 items   ← The Quietus 25 条、Bandcamp 39 条、Stereogum 40 条 全部消失
```

**根因**：`fetch.mjs` 末尾无条件 `fs.writeFileSync(CACHE_FILE, JSON.stringify(results))`，而 `results` 只包含本轮成功的源。三条链路任意一条抖动，对应信源的历史数据就被永久抹掉（线上要靠下一轮抓成功才恢复）。

**修复**（`_build/fetch.mjs`）
- **合并式落盘**：逐源决策 —— 成功才替换 items；失败/空响应/HTTP 非 200 一律保留上次成功快照，并写入 `ok / status / httpStatus / error / lastOkAt`。
- **原子写入**：`cache.json.tmp` + `renameSync`，避免写入中断留下半截 JSON。
- **版本化 schema**：`{ meta, sources[], enrichment{} }`，同时兼容旧版裸数组。
- 效果：The Quietus 403 时输出 `⚠️ [KEEP] The Quietus: HTTP 403 → 保留上次快照 25 条`。

### 1.2 CI 自动化从未执行过

**证据**：仓库根目录**没有 `.github/`**；workflow 实体躺在 `_build/workflows/update-and-deploy.yml`。GitHub Actions 只扫描 `.github/workflows/`，因此那条「每 12 小时自动抓取并部署」的流水线一次都没跑过，`index.html` 一直是手工构建产物。

**修复**：迁移到 `.github/workflows/update-and-deploy.yml`，并补齐工程防护：`concurrency` 防止定时与手动触发叠加、`timeout-minutes`、无变更早退、`[skip ci]` 防自触发、Job Summary 报告信源健康度（`_build/report.mjs`）。同时保留「分支发布」模式并注明切换到 `actions/deploy-pages` 的具体改法。

### 1.3 试听功能是假的

**证据**：构建产物中 `data-preview=""` 出现 **115 次 = 卡片总数**；`app.js` 的 `playTrack()` 因 `audioSrc` 永远为空而 100% 走 `startSynthAmbient()` —— 用 Web Audio 播一个三角波。README 却宣称 "Zero-Latency In-Browser Audio Player / real-time waveform equalizer"。

**修复**
- 在抓取层提取**真实音源**：YouTube Atom 的 `yt:videoId` → 15 条可内嵌播放；RSS `enclosure[type^=audio]` → `<audio>`。实测 0 → 15 条真实可播。
- 无免费音源的信源**如实告知**（"该信源未提供免费试听音源"）+ 引导到平台直链，**彻底删除合成器假音**，播放键改为隐藏，波形只在真正播放时跳动。
- README 同步改写，不再有虚假声明。

### 1.4 空数据会覆盖线上页面

`build.mjs` 原先不校验条目数：缓存为空时照样写出一张空白 `index.html`。现已改为**条目数为 0 时拒绝覆盖**并以非 0 退出码结束（CI 不会提交坏产物）。

---

## 2. P1 · 功能与正确性缺陷

### 2.1 一个信源 100% 抓不到：The Wire
`sources.mjs` 里 The Wire 有完整配置但**没有 `feedUrl`**，而抓取循环第一行就是 `if (!source.feedUrl) continue;` —— 静默跳过。实测 `https://www.thewire.co.uk/rss` 失败，但 **`/news/rss` 返回 200 / 10 条**。已启用。

### 2.2 Boomkat 被当成"实时信源"
`products.atom` 实测 **403**，站点无公开订阅接口。原先它在 UI 上被计入"直连信源"，是虚假指标。现标注为 `curated`：不计入在线数、显示为"无公开订阅接口"。

### 2.3 超时与重试策略必然丢源
实测各源耗时：Pitchfork 4.5s、Bandcamp 2.1s、**Stereogum 5.3s（最坏一轮 111s）**、YouTube 3.5s，而原代码超时设为 **8s 且零重试、全串行**。三个真实故障模式：
- Stereogum 5.3s 常态 + 抖动 → 8s 超时误杀（实测复现 `This operation was aborted`）；
- `daily.bandcamp.com` 间歇性 **TLS 连接重置**（实测复现 `Client network socket disconnected before secure TLS connection was established`，同一地址下一次请求又成功）；
- 串行 5 源累计最坏 40s+。

**修复**：`Promise.allSettled` 并发；超时 20s；**3 次指数退避重试**（800/1600/3200ms）；对 403/404/410 判定为确定性失败不重试。修复后 Stereogum 出现「3 次尝试 · 31297ms」仍成功入库 —— 这在旧代码下必然丢源。

### 2.4 一条坏日期毁掉整个信源
`new Date(pubDate).toISOString()` 遇到无法解析的日期会**抛异常**，被源级 `try/catch` 吞掉 → 整个源被跳过。已改为安全解析（含年份合理性校验 2000–2100），并做"源内全缺时用今日"的二次兜底。

### 2.5 HTML 实体解码不完整
原先只处理 `&amp; &lt; &gt;`。实测 7 条 Quietus 标题残留 `&#8217; &#8216; &#8220;` 等数字实体。已实现命名实体表 + 十进制 `&#nnn;` + 十六进制 `&#xNN;` 完整解码。

### 2.6 `<![CDATA[...]]>` 被当成 HTML 标签删掉（隐蔽但影响大）
`stripHtml()` 的 `/<[^>]*>/g` 会把 `<![CDATA[Album Of The Week]]>` 整块吃掉。后果：**Stereogum 的 40 条 `<category>` 全部丢失**——而这些标签里恰恰包含艺人名。修复后带标签条目 69 → **109/159**。

### 2.7 流派推断基本失效
子串匹配 `text.includes('rock')` 的实测误判：

| 文本 | 旧结果 | 说明 |
| --- | --- | --- |
| "the rockers deliver" | Post-Punk / Rock | `rock` ⊂ `rockers` |
| "full of traps" | Neo-Soul / Jazz / Beats | `rap` ⊂ `traps` |
| "bassist" | Electronic / Club | `bass` ⊂ `bassist` |
| "popstar" | Indie Pop / Bedroom | `pop` ⊂ `popstar` |

更严重的是**分布问题**：`Alternative / Digging` 兜底桶吃掉 **76/115（66%）**，而它是唯一没有对应筛选 pill 的标签 —— 三分之二的内容在任何流派筛选下都找不到。

**修复（三级策略）**
1. **出版方标签优先**：Bandcamp Daily 的 `<category>` 直接就是流派（`Best Jazz` / `Best Electronic` / `Best Country` / `Best Field Recordings` …），实测覆盖 39 条；
2. **词边界正则**兜底，关键词表扩充到 6 桶 × 约 30 词；
3. **只对「发行」条目推断流派** —— 专栏/新闻/专访贴流派本身就是噪音；无标签时如实标 `Genre N/A · 信源未标注`，不再伪造。
4. pill 改为**从真实分布动态生成**（含计数），所有桶都可筛。

### 2.8 跨源重复没有去重
实测 6 组同专辑双源重复（`Cameron Winter | Live at Carnegie Hall` = Pitchfork + Stereogum，`Gilla Band | Pugnello` = Fantano + Stereogum…）。`layout.mjs` 早已支持 `entry.sources[]` 多徽章渲染，但去重逻辑从未实现。现已按 `artist|title` 归一化合并：保留最优封面/摘要/日期/主信源优先级，累积信源 —— 产出 **9 条“多源共识”**，并作为新的高信号筛选维度（旧版形同虚设的 `highlight`）。

### 2.9 艺人名提取脆弱
- Pitchfork：用**专辑名后缀匹配 slug**，剩余部分当艺人；标题与 slug 不一致时退化为「首个词匹配」，实测产出 **"Greg Freeman All Set"**（专辑《All Set The Bone》被切成艺名）、**"Emily a Sprague"**（应为 Emily A. Sprague）。
- Stereogum：依赖 **25 人硬编码名单** + 「取前两个词」，名单外的单名艺人（`Wiki`）被切成 `Wiki the…`。

**修复**
- 发现并利用**出版方自己的标签**：Stereogum 的 `<category>` 里含艺人名 → 单名艺人、多词艺人（`This Is Lorelei`、`Touch Girl Apple Blossom`）全部提取正确，unknow 从 34 降到 2。
- Pitchfork 走 **`og:title` 精修**：评论页返回权威格式 `"<Artist>: <Album>"`。实测 **30/30 成功**、0 条残留错误。为避免每轮重复开销，精修结果按链接写入 `cache.enrichment` **跨轮缓存**，只有新链接才发请求（单轮上限 40 条、并发 5）。
- 为每条实体加 `artistConfidence`，低置信度的艺名在 UI 上弱化显示并可悬停查看说明 —— 而不是把猜测当事实。

### 2.10 摘要几乎不可读
三个问题叠加：150 字符**硬切**（49 条是半句话）、50 条**以换行开头**、Stereogum 的 40 条显示的是订阅样板句 `The post Album Of The Week: … appeared first on Stereogum .`。已实现出版方样板句清洗 + **整句截断**（220 字符，优先句末、退化为词边界并加省略号）；信源确实不给摘要时（Stereogum 仅推送元数据）显示明确占位文案，不再拿样板句充数。

### 2.11 "实时"名不副实
存档日期跨度 `2026-04-21 ~ 2026-10-12`，**5 个月前的条目与当天发布混在「实时电波流」**里。已引入 `isFresh`（45 天窗口，`FETCH_POLICY.maxStaleDays` 可调）：右侧电波流只放新鲜条目，卡片用 ⚡/📁 区分，并提供「实时新声」筛选（106 条）。

### 2.12 纯装饰的 UI，与一条假功能
- **RYM / AOTY 在 115 条中的 112 条恒为 `-`**（只有 4 条硬编码经典有分）；**TND 也只有 3 条**有分（95% 为 `-`）；
- **`Best New Music` 高亮永不触发** —— 实测 Pitchfork 唯一可用的订阅源 `feed-album-reviews/rss` 的 30 条里 **0 条含该标记**，`feed-best-new-music/rss` 与 `feed-reviews/rss` 均为 **404**。也就是说 `.release-card.highlight` 和 `isHighlight` 是死代码。

  → 已移除无效 pill 与死高亮，改为展示**可核验**的数据：多源共识数、信源健康度、可直接试听数（统计口径全部改为真实数据，`5+ 直连信源` 这种硬编码也一并去掉）。
- **「⚡ 刷新实时流」是假功能**：静态站点重新加载同一份 `index.html` **无法重新抓取跨域 RSS**。已改为显示真实快照时间 + 同步年龄 + 指向 CI 记录的链接，并在 title 里说明原因。

### 2.13 降级信源的封面必然全部加载失败
实测 The Quietus 处于 Cloudflare 拦截下时，对图片资源同样返回 **403 + `Cross-Origin-Resource-Policy: same-origin`**，浏览器直接拦掉。真实浏览器回归一次性记录了 **25 条 `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`** = 恰好是 25 张 Quietus 封面。现已对降级信源不渲染 `<img>`（改用渐变 + 首字母占位），封面请求 149 → 123，且 123 条全部可达。

---

## 3. P2 · 安全与工程缺陷

| # | 问题 | 证据 | 修复 |
| --- | --- | --- | --- |
| 3.1 | **目录穿越**（`serve.mjs`） | `path.join(ROOT, decodeURI(url))` 无归属校验。用 `curl --path-as-is http://127.0.0.1:4174/../../.workbuddy/<user>/USER.md` 实测 **HTTP 200 + 554 字节真实文件内容** | 逐段解码 → `path.posix.normalize` → 前缀归属校验；复测 403/404，正常资源仍 200 |
| 3.2 | `Content-Length: undefined` | `writeHead(200, {...{'Content-Length': undefined}})` 会写出字面量 `undefined` | 条件化构造响应头；gzip 时改用 chunked |
| 3.3 | 无压缩 | 本地服务无 gzip | 加入 gzip（HTML 495KB → **40KB 实际下载**，解压校验通过） |
| 3.4 | 未限制方法 | 任意方法都会被当 GET 处理 | 非 GET/HEAD → 405 + `Allow` |
| 3.5 | 第三方文本未转义 | 摘要直接内插文本节点、标题只替换双引号（当前 0 条含裸 `<`，属潜在注入面） | 统一 `esc()` 转义 + `X-Content-Type-Options: nosniff`。修复后裸 `&` 计数 **0** |
| 3.6 | 动态外链缺 `rel="noopener"` | 播放器内 4 个外链由 JS 注入，无该属性 | 补齐 `rel="noopener noreferrer"`（回归断言已覆盖） |
| 3.7 | favicon 非法 | `viewBox="0"` 且 data URL 内裸 `<` `>` 未编码 | 修正为 `viewBox="0 0 100 100"` + 百分号编码 |
| 3.8 | 静默失效的 CSS | `.score-pill.pitchfork.reviewed` 无对应规则（Pitchfork 有 23 条处于该状态） | 随无效 pill 一并清理 |

---

## 4. 我自己引入、并被浏览器验证抓出的回归（诚实披露）

这一节必须写进报告：**纯静态检查（`node --check`、构建成功、grep 断言全绿）之后，页面交互其实完全失效。**

| 回归 | 后果 | 为什么静态检查发现不了 |
| --- | --- | --- |
| **TDZ：`noResultEl` 在使用之后声明** | `applyLanguage()` 在初始化时触发 `filterCards()` → `ReferenceError` → **整个 `DOMContentLoaded` 回调中断**，所有筛选与播放器事件都没绑上。表现为「任何筛选都返回 149 条」、点击试听毫无反应 | 构建成功、HTML 结构完整、`grep` 断言全过。只有真实浏览器会记录 `Runtime.exceptionThrown` |
| **搜索变成大小写敏感**（漏掉 `toLowerCase()`） | 输入 `pitchfork` 命中 **0 条**（应 26 条） | 属性值 `Pitchfork Reviews` 看起来"有内容"，静态看不出比较逻辑 |
| `Content-Length: undefined` | 客户端拿不到正确长度 | 请求仍返回 200，`curl -o /dev/null -w %{http_code}` 看不出来 |

→ 因此把浏览器交互回归固化为 **`npm run e2e`**（`_build/e2e.mjs`，零依赖，Node 22 内置 `WebSocket` + 本机 Chrome/Edge 走 CDP，29 项断言，当前 **29/29 通过 / 未捕获异常 0 / 资源失败 0**）。

---

## 5. 工作原理优化方案

### 5.0 修复后的数据流（当前形态）

```
SOURCES(config, FETCH_POLICY)
   │  并发 allSettled · 20s 超时 · 3 次指数退避 · 403/404 不重试
   ▼
fetch.mjs ──► cache.json  (meta + sources[ per-source status/items ] + enrichment)
   │               ▲
   │               └── 合并式写入：失败源保留上次成功快照 + 原子 rename
   │  精修：Pitchfork og:title（按链接跨轮缓存，仅新链接发请求）
   ▼
data.mjs  归一化：出版方标签 → 流派/艺人；跨源去重；整句摘要；isFresh
   ▼
layout.mjs 全量转义 · 动态筛选 · 信源健康度 · 如实标注
   ▼
index.html ──► serve.mjs(本地, 目录穿越防护+gzip) / GitHub Pages(CI 每 12h)
```

**四条不变量**（后续改动都应受其约束）
1. 单个信源失败，不得改变其它信源的数据；
2. 单轮失败，不得使产物退化（宁可用旧快照 + 标注，也不清空）；
3. 页面上的每个断言都必须在数据里有出处（不编造评分、流派、音源、"实时"）；
4. 第三方文本一律视为不可信输入。

### 5.1 阶段二 · 数据与视图分离（推荐，有明确触发阈值）

**问题**：现在每张卡片把 5 个平台 URL 展开成 `<a>`、把 `data-*` 写满，149 实体 ≈ 5.7k 元素 / 12.2k 属性。若 7 源全部恢复，规模约 **240 实体 / 9.2k 元素**，静态预渲染开始不经济。

**方案**：`index.html` 只留骨架，数据改为同源 `data.json`（预计 60–80 KB raw / 约 12 KB gzip），客户端模板渲染 + 每页 30 条分页或虚拟滚动。

**收益**：HTML 骨架从 ~40 KB gzip 降到 ~5 KB；搜索/排序/多维筛选不再依赖 DOM 属性（现在 `data-search` 是把索引塞进属性，属于反模式）；筛选/排序组合可以从 N×M 个属性组合扩展到任意组合；将来可做增量刷新。

**代价**：首屏依赖 JS（需 `<noscript>` 降级）；SEO 依赖 `data.json` 不被收录，可保留首屏 30 条预渲染作为折中。

**建议阈值**：实体数 > 200，或首屏 gzip > 60 KB 时切换。当前（149 实体 / 39.7 KB gzip）尚未触线，故**本次不做**。

### 5.2 阶段三 · 增量同步与"新上榜"语义（真正的 radar）

现在每轮把整份 feed 重新解析，条目身份靠 `artist|title` 归一化推导。建议：
- fetch 层已取到 `<guid>` 但**未使用** —— 应作为**稳定主键**（`artist|title` 对编辑类条目和拼写差异很脆弱）；
- 在 cache 中持久化 `firstSeenAt`（首次入库时间），从而能计算**差分**：这一轮比上一轮多了什么；
- 于是可以给出 `NEW` / `首见 2h 前` 标记，并让默认视图按"新上榜"排序 —— 这才是"比算法更早听到"的核心承诺；目前的 `pubDate` 只代表**出版方发布时间**，无法区分"刚被我们发现"和"我们一直在忽略它"。

### 5.3 阶段四 · 分级信源策略（把 The Quietus / Boomkat 类问题当一类问题解决）

不应所有源共用一套逻辑。按可获取性分档：

| 档 | 特征 | 代表源 | 策略 |
| --- | --- | --- | --- |
| A | 有公开 RSS/Atom | Wire / Bandcamp / Pitchfork / Stereogum / YouTube | 现有管道 |
| B | 有 **WAF JS 挑战** | The Quietus | 三选一，见下 |
| C | 有 API 需 key | MusicBrainz / Discogs / Last.fm（尚未接入） | 独立适配层 |
| D | 无公开接口 | Boomkat | 明确降级为人工策展位，不计入"实时信源" |

**B 档（The Quietus）三条路线**，已实测：
1. **保留 stale 快照 + 如实标注（当前策略，已实现）** —— 零成本、不撒谎。
2. **CI 中用 headless Chromium 绕过 JS 挑战**：Cloudflare 的 `Just a moment...` 对 RSS、WP REST API、sitemap、**首页**全部返回 403，换 Googlebot/Feedfetcher/curl UA 均 403 —— 纯 HTTP 客户端无解，Playwright 可行（GitHub Actions 环境支持，代价 +1 依赖、约 +15s），是唯一的"完整恢复"路径。
3. **Google News RSS 标题级兜底**：`news.google.com/rss/search?q=site:thequietus.com+when:14d` 实测 **HTTP 200 / 100 条**，标题可用（需剔除 " - The Quietus" 后缀）。**代价**：链接是 `news.google.com/rss/articles/CBMi…` 加密跳转，实测无法还原真实 URL（protobuf + 签名）。**结论：仅适合做"有新内容"的提示，不适合做条目源。**

### 5.4 阶段五 · 评分体系：要么接真数据，要么删

现状已收敛为 P4K（链接/状态）+ TND（真实解析）+ 豆瓣（检索链接），删掉了 97% 为空的 RYM/AOTY。要继续做深，有两条路：
- **(a) 采集扩面**：复用已建成的「按链接增量抓取 + 跨轮缓存」机制（Pitchfork `og:title` 精修已验证可行、30/30）去抓文章页的评分字段。Pitchfork 的分数在页面 JSON-LD / 正文中，可解析。这是**性价比最高的一条**。
- **(b) 接第三方 API**：MusicBrainz / Discogs / Last.fm 可做客观评分聚合，但 RYM / AOTY 无官方 API、且属封闭数据，不要试图"猜"。

原则：**任何不能给出出处的数字，一律不显示。**

### 5.5 阶段六 · 工程与可观测性

- **回归门禁**：把 `npm run e2e` 接进 CI（当前它需要本机浏览器；在 GitHub Actions 上用 `ubuntu-latest` 自带 Chromium 亦可运行）。这是本次唯一能抓住"交互整体失效"的手段。
- **性能**：Stereogum 单轮可达 **111s**（多次超时叠加后退避成功）。建议对其单独设 `timeoutMs`，或把抓取拆成「快源 job」+「慢源 job」并行。
- **告警**：`report.mjs` 已产出 Job Summary；建议再加"同一信源连续 3 轮失败 → 开 issue"。
- **配置集中化**：`FETCH_POLICY`（超时/重试/退避/每源条目上限/时效窗口/精修预算）已是单一入口，调参不需要改逻辑代码。

### 5.6 已知限制（明确不再"修"的部分）

1. **36 条无摘要**：Stereogum 订阅只推元数据（`The post … appeared first on Stereogum`），无正文可摘。已如实占位，不再拿样板句充数。
2. **44/93 发行条目流派未标注**：Stereogum 不发布流派标签、且其条目描述为空。这是**信源的信息缺失，不是管道缺陷**；标注为 `Genre N/A` 而非猜测。
3. **10 条 artist 为 unknown / 1 条 guessed**：多为 The Wire 的行业新闻（本就没有艺人），属预期。
4. **静态站点无法浏览器端刷新数据**：跨域 + CORS 限制，必须由 CI 快照。UI 已如实说明，不再提供假按钮。

---

## 6. 变更清单

**新增**
- `.github/workflows/update-and-deploy.yml` —— 真正会执行的自动化（原 `_build/workflows/` 已移除）
- `_build/e2e.mjs` —— 零依赖浏览器交互回归（29 项断言）
- `_build/report.mjs` —— CI 信源健康度摘要

**重写**
- `_build/fetch.mjs` —— 并发 / 重试 / 合并式缓存 / 原子写入 / 实体解码 / CDATA 修复 / 标签提取 / 真实音源 / og:title 精修
- `_build/data.mjs` —— 词边界流派 + 出版方标签优先 + 跨源去重 + 艺人置信度 + 整句摘要 + 时效
- `_build/layout.mjs` —— 全量转义 / 动态 pill / 信源健康度 / 降级横幅 / 快照时间戳 / 移除死 UI
- `_build/serve.mjs` —— 目录穿越防护 / gzip / 方法限制 / 正确 Content-Length
- `_build/build.mjs` —— 单一数据入口 / 空数据保护 / 原子写入
- `_build/sources.mjs` —— 启用 The Wire / 标注 Boomkat / 记录 WAF 与稳定性 / `FETCH_POLICY`
- `assets/js/app.js` —— 删除合成器假音 / 真实内嵌播放 / 客户端外链展开 / 预建检索索引 / 诚实占位
- `README.md` —— 与实现对齐，删除虚假声明，新增信源现状表
- `package.json` —— 增加 `e2e` / `report` / `ci` 脚本与 `engines`

**未改动（有意保留）**：`assets/css/style.css` 的原有视觉体系（追加式修改，仅新增与修复）、`_build/scores.mjs` 的"严格求真"原则、`_build/cache.json` 的 v1 兼容读取。

---

## 7. 复现与验证命令

```bash
npm run ci          # 抓取 → 构建 → 信源摘要
npm run serve       # 本地预览 http://127.0.0.1:4174
npm run e2e         # 浏览器交互回归（29 项断言）
node _build/report.mjs   # 单独查看信源健康度
```

**本报告所有数字的取得方式**：实网抓取日志（fetch 输出）、`cache.json` 的逐源状态、构建产物统计、`node:zlib` 体积测量、以及 CDP 驱动真实 Chrome 的 29 项交互断言。安全类结论（目录穿越、CORP 拦截、Cloudflare 403）均为**实测复现**，非静态推断。
