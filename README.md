# WORLDMAP.SH

**一个给两个人用的旅行地图** — 记录去过的地方、心愿清单，以及一起规划下一次旅行。

**在线访问：** https://yijiewu51.github.io/worldmap-for-trips/

---

## 功能

- **地图标记** — 用不同颜色标记去过（蓝）、想去（粉）、已计划（紫）的地点
- **实景地图** — ESRI 国家地理地图，草地绿、海洋蓝、沙漠棕，真实地形
- **双人实时同步** — 基于 Supabase，两人同时编辑，改动秒级同步
- **AI 行程规划** — 接入 DeepSeek AI，自动生成中文游玩建议，含图片和详情，分配到每一天
- **Share Code** — 一串代码发给对方，粘贴即可加入同一数据库，无需注册

## 技术栈

纯静态网页，无后端，直接部署到 GitHub Pages。

| 技术 | 用途 |
|------|------|
| Leaflet.js | 交互地图 |
| Supabase | 实时数据库同步 |
| DeepSeek API | AI 行程生成 |
| ESRI NatGeo Tiles | 地图底图 |
| JetBrains Mono | Terminal 风格字体 |

## 本地运行

\`\`\`bash
git clone https://github.com/yijiewu51/worldmap-for-trips.git
cd worldmap-for-trips
python3 -m http.server 8765
# 打开 http://localhost:8765
\`\`\`

## 配置云同步

1. 去 [supabase.com](https://supabase.com) 创建免费项目
2. 在 SQL Editor 执行：

\`\`\`sql
create table worldmap_data (
  id text primary key default 'main',
  data jsonb,
  updated_at timestamptz default now()
);
alter table worldmap_data enable row level security;
create policy "open" on worldmap_data for all using (true) with check (true);
\`\`\`

3. 将 Project URL 和 anon key 填入网页的 **SYNC** 设置并点 CONNECT
4. 复制生成的 Share Code 发给对方，对方粘贴后点 CONNECT 即可连接同一数据库

## AI 行程规划

在 ⚙ Settings 中填入 [DeepSeek API Key](https://platform.deepseek.com)，在 Trip Planner 中即可使用。

---

*Made with love for two.*
