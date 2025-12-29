# 🌐 超简单同步配置（无需验证码）

如果 JSONBin.io 收不到验证码，这里有更简单的方法！

## 🎯 方法一：使用 GitHub Gist（推荐，最简单）

**优点**：无需验证码，只需GitHub账号（如果没有可以快速注册）

### 步骤1：创建 Gist（1分钟）

1. 访问 https://gist.github.com/
2. 如果有GitHub账号，直接登录；如果没有，点击"Sign up"注册（**不需要邮箱验证码**）
3. 登录后，你会看到一个创建Gist的页面，有两个输入框：
   - **上面的输入框**（文件名）：输入 `travel-map-data.json`
   - **下面的大文本框**（内容）：输入 `{}`（就输入这两个大括号：左大括号 `{` 和右大括号 `}`）
4. 在页面底部，选择 **"Create public gist"**（公开的，因为只有知道URL的人才能访问）
5. 点击绿色的 **"Create public gist"** 按钮
6. **重要**：创建成功后，页面会跳转，你会看到你创建的Gist
   - 点击文件名 `travel-map-data.json`（蓝色链接）
   - 或者直接点击页面上的 **"Raw"** 按钮（在文件内容右上角）
7. 复制浏览器地址栏的URL（类似：`https://gist.githubusercontent.com/username/abc123.../raw/...`）
   - 这个URL应该以 `/raw/` 结尾

### 步骤2：配置应用（30秒）

1. 打开应用页面
2. 按 `F12`（或 `Cmd+Option+J`）打开浏览器控制台
3. 复制粘贴这行代码并回车：
   ```javascript
   localStorage.setItem('travelMapGistUrl', '你刚才复制的Gist URL')
   ```
   （记得把URL替换成你复制的）
4. 刷新页面

### 步骤3：共享房间ID（10秒）

1. 在浏览器控制台运行：
   ```javascript
   localStorage.getItem('travelMapRoomId')
   ```
2. 复制显示的房间ID
3. 发送给你的女朋友
4. 她在她的浏览器控制台运行：
   ```javascript
   localStorage.setItem('travelMapRoomId', '你发送给她的房间ID')
   ```
5. 她也设置相同的Gist URL（步骤2）
6. 刷新页面

**完成！** 现在数据会自动同步了！

---

## 🎯 方法二：使用 Pastebin（无需注册）

### 步骤1：创建 Paste

1. 访问 https://pastebin.com/
2. 在文本框中输入：`{}`
3. 点击 "Create New Paste"
4. 复制浏览器地址栏的URL（类似：`https://pastebin.com/raw/abc123`）

### 步骤2：配置应用

同GitHub Gist的步骤2，但使用：
```javascript
localStorage.setItem('travelMapPastebinUrl', '你复制的Pastebin URL')
```

---

## 🎯 方法三：最简单 - 使用导出/导入（无需任何配置）

如果以上方法都觉得麻烦，可以直接使用导出/导入功能：

1. **你添加完地点后**：
   - 点击右上角"📤 导出数据"（如果按钮还在）
   - 或者打开浏览器控制台，运行：`exportData()`
   - 会下载一个JSON文件

2. **发送给她**：
   - 通过微信/邮件发送这个文件

3. **她导入**：
   - 打开浏览器控制台，运行：`importData(file)`（需要选择文件）
   - 或者我可以帮你把导入按钮加回来

---

## ✅ 推荐方案

**如果你有GitHub账号**：使用方法一（GitHub Gist），最简单且稳定

**如果没有GitHub账号**：快速注册一个（不需要邮箱验证），然后使用方法一

**如果不想注册任何账号**：使用方法三（导出/导入），虽然需要手动操作，但最简单

---

## 🆘 需要帮助？

如果遇到问题，告诉我你选择的方法，我可以帮你详细指导！

