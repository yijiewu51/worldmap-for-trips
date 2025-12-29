# 🔑 GitHub API 自动同步配置（真正自动同步）

如果你想实现真正的自动同步（无需手动导出/导入），可以配置 GitHub API。

## 📋 配置步骤（约5分钟）

### 第一步：创建 GitHub Personal Access Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 填写信息：
   - **Note**（备注）：`Travel Map Sync`（随意填写）
   - **Expiration**（过期时间）：选择 "No expiration"（永不过期）或设置一个较长时间
   - **Select scopes**（权限）：勾选 `gist`（只需要这一个权限）
4. 点击 "Generate token"（绿色按钮）
5. **重要**：复制生成的 token（类似：`ghp_xxxxxxxxxxxxxxxxxxxx`）
   - ⚠️ 这个 token 只显示一次，请立即复制保存！

### 第二步：配置应用

1. 打开你的旅行地图应用
2. 按 `Cmd + Option + J`（Mac）打开控制台
3. 输入以下命令（替换成你的 token）：

```javascript
localStorage.setItem('travelMapGithubToken', '你刚才复制的token')
```

4. 按回车
5. 刷新页面（`Cmd + R`）

### 第三步：验证

刷新后：
- 控制台应该显示：`使用GitHub Gist同步`
- 右上角应该显示：`已同步（云端）`（而不是"Gist只读"）
- 添加一个测试地点，应该能自动同步

### 第四步：分享给女朋友

1. 她也需要创建自己的 GitHub Token（步骤一）
2. 她也设置相同的 Gist URL（你之前设置的）
3. 她也设置自己的 Token（步骤二）
4. 她也设置相同的房间ID（你之前设置的）

**完成！** 现在数据会自动双向同步了！

---

## ✅ 配置后的效果

- ✅ **自动同步**：添加/编辑/删除地点时自动同步
- ✅ **双向同步**：你们两个都能看到对方的更新
- ✅ **实时更新**：每10秒自动检查更新
- ✅ **无需手动操作**：完全自动化

---

## 🔒 安全说明

- GitHub Token 是私密的，不要分享给其他人
- Token 只用于访问你的 Gist，相对安全
- 如果担心安全，可以设置过期时间

---

## 🆘 常见问题

**Q: Token 在哪里找？**
A: https://github.com/settings/tokens → Generate new token

**Q: 配置后还是显示"Gist只读"？**
A: 检查 token 是否正确设置，刷新页面重试

**Q: 她需要配置吗？**
A: 是的，她也需要创建自己的 token 并设置

**Q: Token 会过期吗？**
A: 如果设置了过期时间会过期，建议选择"No expiration"

---

配置完成后，你们就可以实现真正的自动同步了！🎉

