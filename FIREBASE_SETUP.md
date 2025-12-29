# 🔥 Firebase 云存储配置指南

本指南将帮助你配置 Firebase，实现跨设备自动同步功能。

## 📋 配置步骤

### 第一步：创建 Firebase 项目

1. 访问 [Firebase 控制台](https://console.firebase.google.com/)
2. 点击"添加项目"或"创建项目"
3. 输入项目名称（例如：`travel-map`）
4. 按照提示完成项目创建

### 第二步：启用 Realtime Database

1. 在 Firebase 控制台中，点击左侧菜单的"Realtime Database"
2. 点击"创建数据库"
3. 选择"以测试模式启动"（开发阶段）
4. 选择数据库位置（建议选择离你最近的区域，如 `asia-east1`）
5. 点击"启用"

### 第三步：配置数据库规则（重要！）

1. 在 Realtime Database 页面，点击"规则"标签
2. 将规则修改为以下内容（允许读写，但需要密码保护）：

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

3. 点击"发布"

**注意**：这是测试模式，允许任何人读写。由于我们已经有了应用层面的密码保护，这是可以接受的。如果需要更安全，可以配置 Firebase Authentication。

### 第四步：获取配置信息

1. 在 Firebase 控制台中，点击左侧的 ⚙️（设置图标）
2. 选择"项目设置"
3. 滚动到"你的应用"部分
4. 如果没有应用，点击"添加应用" → 选择"Web"（</>图标）
5. 注册应用（可以随意命名，如 `Travel Map`）
6. 复制配置信息（会显示类似下面的代码）：

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 第五步：配置应用

1. 打开 `app.js` 文件
2. 找到 `initializeFirebase()` 函数（大约在第30行）
3. 将 `firebaseConfig` 对象中的值替换为你从 Firebase 控制台复制的值：

```javascript
const firebaseConfig = {
    apiKey: "你复制的API_KEY",
    authDomain: "你复制的AUTH_DOMAIN",
    databaseURL: "你复制的DATABASE_URL",
    projectId: "你复制的PROJECT_ID",
    storageBucket: "你复制的STORAGE_BUCKET",
    messagingSenderId: "你复制的MESSAGING_SENDER_ID",
    appId: "你复制的APP_ID"
};
```

### 第六步：共享房间ID

1. 打开应用后，打开浏览器控制台（F12 或 Cmd+Option+J）
2. 运行以下命令查看你的房间ID：
   ```javascript
   localStorage.getItem('travelMapRoomId')
   ```
3. 将这个房间ID发送给你的女朋友
4. 她需要在她的浏览器控制台中运行：
   ```javascript
   localStorage.setItem('travelMapRoomId', '你发送给她的房间ID')
   ```
5. 然后刷新页面

**或者更简单的方法**：
- 你们两个都打开应用后，房间ID会自动生成
- 你需要查看你的房间ID并告诉她
- 她设置相同的房间ID后，数据就会自动同步

## ✅ 验证配置

1. 配置完成后，刷新页面
2. 打开浏览器控制台（F12），应该看到 "Firebase初始化成功"
3. 右上角的同步状态应该显示"已同步（云端）"
4. 添加一个测试地点
5. 在另一个设备上打开应用（使用相同的房间ID），应该能看到新添加的地点

## 🔒 安全说明

- Firebase 免费套餐有使用限制，但对于个人使用完全足够
- 数据库规则设置为允许读写，但由于应用层面有密码保护，相对安全
- 房间ID是私密的，只有知道房间ID的人才能访问数据
- 建议不要公开分享房间ID

## 🆘 常见问题

**Q: 配置后还是显示"已同步（本地）"？**
A: 检查浏览器控制台是否有错误信息，确认配置信息是否正确。

**Q: 数据没有同步？**
A: 确认你们两个使用的是相同的房间ID。

**Q: Firebase 免费吗？**
A: 是的，Firebase 免费套餐对于个人使用完全足够。

**Q: 可以更换房间ID吗？**
A: 可以，在浏览器控制台运行：
   ```javascript
   localStorage.removeItem('travelMapRoomId')
   ```
   然后刷新页面，会生成新的房间ID。

## 📞 需要帮助？

如果遇到问题，检查浏览器控制台的错误信息，或查看 Firebase 控制台的数据是否正常更新。

