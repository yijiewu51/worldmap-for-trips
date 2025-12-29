# 🌐 简单同步配置指南（超简单版）

不需要任何编程知识！只需要3步就能实现跨设备自动同步。

## 🎯 方法一：使用 JSONBin.io（推荐，最简单）

### 步骤1：获取存储地址（只需1分钟）

1. 访问 https://jsonbin.io/
2. 点击右上角 "Sign Up" 注册（免费）
3. 登录后，点击 "Create Bin"
4. 在 Bin 名称输入：`travel-map`（或任意名称）
5. 点击 "Create"
6. **重要**：复制页面上的 "Bin ID"（类似：`507f1f77bcf86cd799439011`）

### 步骤2：配置应用（只需30秒）

1. 打开 `app.js` 文件
2. 找到第 `loadSyncApiUrl` 函数（大约第50行）
3. 找到这一行：
   ```javascript
   const jsonBinId = localStorage.getItem('travelMapJsonBinId');
   ```
4. 在浏览器控制台（F12）运行：
   ```javascript
   localStorage.setItem('travelMapJsonBinId', '你刚才复制的Bin ID')
   ```
5. 刷新页面

### 步骤3：共享房间ID（只需10秒）

1. 打开浏览器控制台（F12）
2. 运行：
   ```javascript
   localStorage.getItem('travelMapRoomId')
   ```
3. 将这个房间ID发送给你的女朋友
4. 她在她的浏览器控制台运行：
   ```javascript
   localStorage.setItem('travelMapRoomId', '你发送给她的房间ID')
   ```
5. 她刷新页面

**完成！** 现在你们就可以在不同设备上自动同步数据了！

---

## 🎯 方法二：使用 GitHub Gist（如果你有GitHub账号）

### 步骤1：创建 Gist

1. 访问 https://gist.github.com/
2. 登录你的GitHub账号
3. 文件名输入：`travel-map-data.json`
4. 内容输入：`{}`（空JSON对象）
5. 点击 "Create secret gist"（或公开gist也可以）
6. **重要**：复制页面URL，例如：`https://gist.githubusercontent.com/username/abc123def456/raw/...`

### 步骤2：配置应用

1. 打开浏览器控制台（F12）
2. 运行：
   ```javascript
   localStorage.setItem('travelMapGistUrl', '你复制的Gist URL')
   ```
3. 刷新页面

### 步骤3：共享房间ID

同方法一的步骤3

---

## 🎯 方法三：最简单 - 使用共享房间ID（无需任何配置）

如果你们经常使用同一台电脑，或者不介意手动同步，可以：

1. **不需要任何配置**
2. 只需要共享房间ID（见方法一的步骤3）
3. 使用导出/导入功能手动同步

---

## ✅ 验证配置

配置完成后：

1. 刷新页面
2. 右上角应该显示"已同步（云端）"或"同步中（云端）"
3. 添加一个测试地点
4. 在另一个设备上打开应用，应该能看到新添加的地点

---

## 🆘 常见问题

**Q: JSONBin.io 免费吗？**
A: 是的，免费套餐足够个人使用。

**Q: 需要编程知识吗？**
A: 不需要！只需要复制粘贴几个ID。

**Q: 数据安全吗？**
A: 房间ID是私密的，只有知道房间ID的人才能访问数据。

**Q: 配置后还是显示"已同步（本地）"？**
A: 检查浏览器控制台是否有错误，确认Bin ID是否正确设置。

**Q: 可以更换房间ID吗？**
A: 可以，在浏览器控制台运行：
   ```javascript
   localStorage.removeItem('travelMapRoomId')
   ```
   然后刷新页面。

---

## 📝 快速参考

**设置 Bin ID：**
```javascript
localStorage.setItem('travelMapJsonBinId', '你的Bin ID')
```

**查看房间ID：**
```javascript
localStorage.getItem('travelMapRoomId')
```

**设置房间ID（给对方）：**
```javascript
localStorage.setItem('travelMapRoomId', '房间ID')
```

**清除所有配置：**
```javascript
localStorage.removeItem('travelMapJsonBinId')
localStorage.removeItem('travelMapRoomId')
```

