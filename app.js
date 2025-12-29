// 应用状态
let map;
let places = [];
let currentFilter = 'all';
let editingPlaceId = null;
let markers = {};
let searchMarker = null; // 用于显示搜索结果的位置标记
let searchTimeout = null; // 防抖定时器
let currentUser = 'user1'; // 当前用户
let users = {
    user1: { name: '用户1', avatar: '' },
    user2: { name: '用户2', avatar: '' }
};
let accessPassword = ''; // 访问密码
let syncEnabled = true; // 自动同步是否启用
let syncInterval = null; // 同步定时器
let lastSyncTime = null; // 最后同步时间
let syncStorageKey = 'travelMapSharedData'; // 共享存储键名（本地备用）
let roomId = null; // 房间ID（用于共享数据）
let syncApiUrl = null; // 同步API URL（简单存储服务）

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 首先确保所有模态框和容器初始状态正确
    const loginModal = document.getElementById('loginModal');
    const userSettingsModal = document.getElementById('userSettingsModal');
    const placeModal = document.getElementById('placeModal');
    const detailModal = document.getElementById('detailModal');
    const mainContainer = document.getElementById('mainContainer');
    
    // 强制隐藏所有模态框（使用内联样式确保优先级）
    if (loginModal) {
        loginModal.classList.remove('show');
        loginModal.style.display = 'none';
    }
    if (userSettingsModal) {
        userSettingsModal.classList.remove('show');
        userSettingsModal.style.display = 'none';
    }
    if (placeModal) {
        placeModal.classList.remove('show');
        placeModal.style.display = 'none';
    }
    if (detailModal) {
        detailModal.classList.remove('show');
        detailModal.style.display = 'none';
    }
    
    // 确保主容器初始是隐藏的
    if (mainContainer) {
        mainContainer.style.display = 'none';
    }
    
    // 加载数据
    loadUsers();
    loadAccessPassword();
    loadRoomId();
    loadSyncApiUrl();
    initDateSelectors(); // 初始化日期选择器
    
    // 根据登录状态显示正确的界面
    checkAccess();
    
    // 设置事件监听器
    setupEventListeners();
});

// 初始化日期选择器（年份和月份）
function initDateSelectors() {
    // 初始化年份选择器（从2000年到2030年）
    const yearSelect = document.getElementById('placeDateYear');
    const monthSelect = document.getElementById('placeDateMonth');
    
    if (yearSelect) {
        const currentYear = new Date().getFullYear();
        for (let year = 2000; year <= 2030; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year + '年';
            if (year === currentYear) {
                option.selected = false; // 默认不选中，让用户选择
            }
            yearSelect.appendChild(option);
        }
    }
    
    if (monthSelect) {
        const months = [
            { value: '01', text: '1月' }, { value: '02', text: '2月' },
            { value: '03', text: '3月' }, { value: '04', text: '4月' },
            { value: '05', text: '5月' }, { value: '06', text: '6月' },
            { value: '07', text: '7月' }, { value: '08', text: '8月' },
            { value: '09', text: '9月' }, { value: '10', text: '10月' },
            { value: '11', text: '11月' }, { value: '12', text: '12月' }
        ];
        months.forEach(month => {
            const option = document.createElement('option');
            option.value = month.value;
            option.textContent = month.text;
            monthSelect.appendChild(option);
        });
    }
}

// 加载房间ID
function loadRoomId() {
    roomId = localStorage.getItem('travelMapRoomId');
    if (!roomId) {
        // 如果没有房间ID，生成一个（你们需要共享这个ID）
        roomId = 'travel-map-' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('travelMapRoomId', roomId);
    }
}

// 加载同步API URL（简单配置）
function loadSyncApiUrl() {
    // 方法1：使用 GitHub Gist（最简单，无需验证码，只需GitHub账号）
    const gistUrl = localStorage.getItem('travelMapGistUrl');
    if (gistUrl && gistUrl.includes('gist.githubusercontent.com')) {
        syncApiUrl = gistUrl;
        console.log('使用GitHub Gist同步');
        return;
    }
    
    // 方法2：使用 JSONBin.io（如果之前配置过）
    const jsonBinId = localStorage.getItem('travelMapJsonBinId');
    if (jsonBinId && jsonBinId !== 'YOUR_BIN_ID') {
        syncApiUrl = `https://api.jsonbin.io/v3/b/${jsonBinId}`;
        console.log('使用JSONBin.io同步');
        return;
    }
    
    // 未配置，使用本地存储模式
    syncApiUrl = null;
    console.log('未配置同步API，使用本地存储模式');
}

// Firebase代码已移除，使用简单的JSONBin.io方案

// 检查访问权限
function checkAccess() {
    // 先确保所有界面都隐藏
    const loginModal = document.getElementById('loginModal');
    const mainContainer = document.getElementById('mainContainer');
    const userSettingsModal = document.getElementById('userSettingsModal');
    
    if (loginModal) loginModal.classList.remove('show');
    if (mainContainer) mainContainer.style.display = 'none';
    if (userSettingsModal) userSettingsModal.classList.remove('show');
    
    const savedPassword = localStorage.getItem('travelMapPassword');
    const isAuthenticated = sessionStorage.getItem('travelMapAuthenticated') === 'true';
    
    if (savedPassword && isAuthenticated) {
        // 已认证，显示主界面
        showMainInterface();
    } else {
        // 显示登录界面
        showLoginInterface();
    }
}

// 显示登录界面
function showLoginInterface() {
    const loginModal = document.getElementById('loginModal');
    const mainContainer = document.getElementById('mainContainer');
    const userSettingsModal = document.getElementById('userSettingsModal');
    const placeModal = document.getElementById('placeModal');
    const detailModal = document.getElementById('detailModal');
    
    // 隐藏所有其他界面
    if (mainContainer) {
        mainContainer.style.display = 'none';
    }
    if (userSettingsModal) {
        userSettingsModal.classList.remove('show');
        userSettingsModal.style.display = 'none';
    }
    if (placeModal) {
        placeModal.classList.remove('show');
        placeModal.style.display = 'none';
    }
    if (detailModal) {
        detailModal.classList.remove('show');
        detailModal.style.display = 'none';
    }
    
    // 显示登录界面
    if (loginModal) {
        loginModal.style.display = 'flex';
        loginModal.classList.add('show');
    }
}

// 显示主界面
function showMainInterface() {
    try {
        const loginModal = document.getElementById('loginModal');
        const mainContainer = document.getElementById('mainContainer');
        const userSettingsModal = document.getElementById('userSettingsModal');
        const placeModal = document.getElementById('placeModal');
        const detailModal = document.getElementById('detailModal');
        
        // 隐藏登录界面
        if (loginModal) {
            loginModal.classList.remove('show');
            loginModal.style.display = 'none';
        }
        
        // 隐藏所有模态框（除非用户主动打开）
        if (userSettingsModal && !userSettingsModal.classList.contains('show')) {
            userSettingsModal.style.display = 'none';
        }
        if (placeModal && !placeModal.classList.contains('show')) {
            placeModal.style.display = 'none';
        }
        if (detailModal && !detailModal.classList.contains('show')) {
            detailModal.style.display = 'none';
        }
        
        // 显示主界面
        if (mainContainer) {
            mainContainer.style.display = 'block';
        }
        
        if (!map) {
            initMap();
        }
        loadPlaces();
        updateUserDisplay();
        updateUserAvatars();
        // 启动自动同步
        if (syncEnabled) {
            startAutoSync();
        }
    } catch (error) {
        console.error('显示主界面时出错:', error);
        alert('页面加载出错，请刷新页面重试。错误：' + error.message);
    }
}

// 加载用户信息
function loadUsers() {
    const saved = localStorage.getItem('travelMapUsers');
    if (saved) {
        try {
            users = JSON.parse(saved);
        } catch (e) {
            console.error('加载用户信息失败:', e);
        }
    }
    updateUserAvatars();
}

// 保存用户信息
function saveUsers() {
    localStorage.setItem('travelMapUsers', JSON.stringify(users));
    updateUserAvatars();
    updateUserDisplay();
    // 同步到云端
    if (syncApiUrl) {
        syncToCloud();
    }
}

// 加载访问密码
function loadAccessPassword() {
    const saved = localStorage.getItem('travelMapPassword');
    if (saved) {
        accessPassword = saved;
    }
}

// 更新用户头像显示
function updateUserAvatars() {
    try {
        // 更新表单中的用户头像
        const user1Avatar = users.user1.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMmMyLjIxIDAgNC0xLjc5IDQtNHMtMS43OS00LTQtNC00IDEuNzktNCA0IDEuNzkgNCA0IDR6bTAgMmMtMi42NyAwLTggMS4zNC04IDR2MmgxNnYtMmMwLTIuNjYtNS4zMy00LTgtNHoiLz4KPC9zdmc+Cjwvc3ZnPg==';
        const user2Avatar = users.user2.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM3NjRiYTIiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMmMyLjIxIDAgNC0xLjc5IDQtNHMtMS43OS00LTQtNC00IDEuNzktNCA0IDEuNzkgNCA0IDR6bTAgMmMtMi42NyAwLTggMS4zNC04IDR2MmgxNnYtMmMwLTIuNjYtNS4zMy00LTgtNHoiLz4KPC9zdmc+Cjwvc3ZnPg==';
        
        const formUser1Avatar = document.getElementById('formUser1Avatar');
        const formUser2Avatar = document.getElementById('formUser2Avatar');
        const user1AvatarPreview = document.getElementById('user1AvatarPreview');
        const user2AvatarPreview = document.getElementById('user2AvatarPreview');
        const formUser1Name = document.getElementById('formUser1Name');
        const formUser2Name = document.getElementById('formUser2Name');
        const user1Name = document.getElementById('user1Name');
        const user2Name = document.getElementById('user2Name');
        
        if (formUser1Avatar) formUser1Avatar.src = user1Avatar;
        if (formUser2Avatar) formUser2Avatar.src = user2Avatar;
        if (user1AvatarPreview) user1AvatarPreview.src = user1Avatar;
        if (user2AvatarPreview) user2AvatarPreview.src = user2Avatar;
        if (formUser1Name) formUser1Name.textContent = users.user1.name || '用户1';
        if (formUser2Name) formUser2Name.textContent = users.user2.name || '用户2';
        if (user1Name) user1Name.value = users.user1.name || '用户1';
        if (user2Name) user2Name.value = users.user2.name || '用户2';
    } catch (error) {
        console.error('更新用户头像时出错:', error);
    }
}

// 更新当前用户显示
function updateUserDisplay() {
    try {
        const currentUserData = users[currentUser];
        const currentUserAvatar = document.getElementById('currentUserAvatar');
        const currentUserName = document.getElementById('currentUserName');
        
        if (currentUserAvatar) {
            currentUserAvatar.src = currentUserData.avatar || getDefaultAvatar(currentUser);
        }
        if (currentUserName) {
            currentUserName.textContent = currentUserData.name || (currentUser === 'user1' ? '用户1' : '用户2');
        }
    } catch (error) {
        console.error('更新当前用户显示时出错:', error);
    }
}

// 获取默认头像
function getDefaultAvatar(userId) {
    if (userId === 'user1') {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgiIGhlaWdodD0iMjgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMmMyLjIxIDAgNC0xLjc5IDQtNHMtMS43OS00LTQtNC00IDEuNzktNCA0IDEuNzkgNCA0IDR6bTAgMmMtMi42NyAwLTggMS4zNC04IDR2MmgxNnYtMmMwLTIuNjYtNS4zMy00LTgtNHoiLz4KPC9zdmc+Cjwvc3ZnPg==';
    } else {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgiIGhlaWdodD0iMjgiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM3NjRiYTIiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAxMmMyLjIxIDAgNC0xLjc5IDQtNHMtMS43OS00LTQtNC00IDEuNzktNCA0IDEuNzkgNCA0IDR6bTAgMmMtMi42NyAwLTggMS4zNC04IDR2MmgxNnYtMmMwLTIuNjYtNS4zMy00LTgtNHoiLz4KPC9zdmc+Cjwvc3ZnPg==';
    }
}

// 初始化地图
function initMap() {
    // 默认中心点：中国
    map = L.map('map').setView([35.8617, 104.1954], 3);
    
    // 使用OpenStreetMap瓦片（英文版）
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // 添加英文地名标签层（可选，如果需要更明确的英文地名）
    // 注意：OpenStreetMap默认瓦片已经是英文，这里主要是确保地理编码使用英文
    
    // 地图点击事件
    map.on('click', function(e) {
        if (document.getElementById('placeModal').classList.contains('show')) {
            document.getElementById('placeLat').value = e.latlng.lat.toFixed(6);
            document.getElementById('placeLng').value = e.latlng.lng.toFixed(6);
        }
    });
}

// 设置事件监听器
function setupEventListeners() {
    // 登录表单
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const password = document.getElementById('accessPassword').value.trim();
        const savedPassword = localStorage.getItem('travelMapPassword');
        const defaultPassword = '20251213'; // 默认密码
        
        // 如果输入的是默认密码，直接允许进入（无论之前设置的是什么密码）
        if (password === defaultPassword) {
            // 如果之前没有设置密码，保存默认密码
            if (!savedPassword) {
                localStorage.setItem('travelMapPassword', defaultPassword);
            }
            sessionStorage.setItem('travelMapAuthenticated', 'true');
            console.log('密码验证成功，准备显示主界面');
            showMainInterface();
            return;
        }
        
        if (!savedPassword) {
            // 首次使用，使用输入的密码或默认密码
            const finalPassword = password || defaultPassword;
            localStorage.setItem('travelMapPassword', finalPassword);
            accessPassword = finalPassword;
            sessionStorage.setItem('travelMapAuthenticated', 'true');
            showMainInterface();
        } else if (password === savedPassword) {
            // 密码正确
            sessionStorage.setItem('travelMapAuthenticated', 'true');
            showMainInterface();
        } else {
            alert('密码错误！\n\n提示：默认密码是 20251213\n\n如果忘记密码，可以点击"重置密码"按钮清除所有数据。');
        }
    });
    
    // 重置密码按钮
    document.getElementById('resetPasswordBtn').addEventListener('click', function() {
        if (confirm('确定要重置密码吗？这将清除所有数据（包括地点记录）！')) {
            localStorage.removeItem('travelMapPassword');
            localStorage.removeItem('travelPlaces');
            localStorage.removeItem('travelMapUsers');
            sessionStorage.removeItem('travelMapAuthenticated');
            alert('密码已重置！请刷新页面，将使用默认密码 20251213');
            location.reload();
        }
    });
    
    // 同步状态按钮（手动同步）
    const syncStatusBtn = document.getElementById('syncStatusBtn');
    if (syncStatusBtn) {
        syncStatusBtn.addEventListener('click', function() {
            if (syncApiUrl) {
                // 云端同步：先上传，再下载
                syncToCloud();
                setTimeout(function() {
                    loadFromCloud();
                }, 500);
            } else {
                // 本地存储同步
                syncToSharedStorage();
                loadFromSharedStorage();
            }
            updateSyncStatus('同步中...');
        });
    }
    
    // 导出数据按钮（如果存在，保留作为备用）
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', function() {
            exportData();
        });
    }
    
    // 导入数据按钮（如果存在，保留作为备用）
    const importDataBtn = document.getElementById('importDataBtn');
    if (importDataBtn) {
        importDataBtn.addEventListener('click', function() {
            const importFileInput = document.getElementById('importFileInput');
            if (importFileInput) {
                importFileInput.click();
            }
        });
    }
    
    // 文件选择后导入（如果存在）
    const importFileInput = document.getElementById('importFileInput');
    if (importFileInput) {
        importFileInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                importData(e.target.files[0]);
            }
        });
    }
    
    // 如果首次使用，自动填充默认密码
    window.addEventListener('load', function() {
        const savedPassword = localStorage.getItem('travelMapPassword');
        if (!savedPassword) {
            document.getElementById('accessPassword').value = '20251213';
        }
    });
    
    // 用户设置按钮
    document.getElementById('userSettingsBtn').addEventListener('click', function() {
        // 确保显示当前保存的用户信息
        document.getElementById('user1Name').value = users.user1.name || '用户1';
        document.getElementById('user2Name').value = users.user2.name || '用户2';
        const userSettingsModal = document.getElementById('userSettingsModal');
        if (userSettingsModal) {
            userSettingsModal.style.display = 'flex';
            userSettingsModal.classList.add('show');
        }
    });
    
    // 关闭用户设置
    document.querySelector('.close-settings').addEventListener('click', function() {
        document.getElementById('userSettingsModal').classList.remove('show');
    });
    
    // 保存用户设置
    document.getElementById('saveUserSettings').addEventListener('click', function() {
        const user1NameInput = document.getElementById('user1Name');
        const user2NameInput = document.getElementById('user2Name');
        
        if (user1NameInput) {
            users.user1.name = user1NameInput.value.trim() || '用户1';
        }
        if (user2NameInput) {
            users.user2.name = user2NameInput.value.trim() || '用户2';
        }
        
        saveUsers();
        document.getElementById('userSettingsModal').classList.remove('show');
        alert('用户设置已保存！');
    });
    
    // 头像上传
    document.getElementById('user1AvatarInput').addEventListener('change', function(e) {
        handleAvatarUpload(e, 'user1');
    });
    
    document.getElementById('user2AvatarInput').addEventListener('change', function(e) {
        handleAvatarUpload(e, 'user2');
    });
    
    // 切换用户按钮
    document.getElementById('switchUserBtn').addEventListener('click', function() {
        currentUser = currentUser === 'user1' ? 'user2' : 'user1';
        updateUserDisplay();
        // 自动选择当前用户
        document.querySelector(`input[name="placeUser"][value="${currentUser}"]`).checked = true;
    });
    
    // 添加地点按钮
    document.getElementById('addPlaceBtn').addEventListener('click', function() {
        editingPlaceId = null;
        document.getElementById('modalTitle').textContent = '添加新地点';
        document.getElementById('placeForm').reset();
        document.getElementById('deleteBtn').style.display = 'none';
        // 重置日期选择器
        document.getElementById('placeDateYear').value = '';
        document.getElementById('placeDateMonth').value = '';
        document.getElementById('placeDate').value = '';
        // 默认选择当前用户
        document.querySelector(`input[name="placeUser"][value="${currentUser}"]`).checked = true;
        const placeModal = document.getElementById('placeModal');
        if (placeModal) {
            placeModal.style.display = 'flex';
            placeModal.style.position = 'fixed';
            placeModal.style.top = '0';
            placeModal.style.left = '0';
            placeModal.style.width = '100%';
            placeModal.style.height = '100%';
            placeModal.style.zIndex = '10000';
            placeModal.classList.add('show');
        }
    });
    
    // 关闭模态框
    document.querySelector('.close').addEventListener('click', closeModal);
    document.querySelector('.close-detail').addEventListener('click', closeDetailModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    // 点击模态框外部关闭
    document.getElementById('placeModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
    
    document.getElementById('detailModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeDetailModal();
        }
    });
    
    document.getElementById('userSettingsModal').addEventListener('click', function(e) {
        if (e.target === this) {
            document.getElementById('userSettingsModal').classList.remove('show');
        }
    });
    
    // 表单提交
    const placeForm = document.getElementById('placeForm');
    if (placeForm) {
        placeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('表单提交事件触发');
            savePlace().catch(error => {
                console.error('保存地点失败:', error);
                alert('保存失败：' + (error.message || '请重试'));
            });
            return false;
        });
    }
    
    // 删除按钮
    document.getElementById('deleteBtn').addEventListener('click', function() {
        if (editingPlaceId && confirm('确定要删除这个地点吗？')) {
            deletePlace(editingPlaceId);
            closeModal();
        }
    });
    
    // 搜索地点坐标
    document.getElementById('searchLocationBtn').addEventListener('click', function() {
        searchLocationByName();
    });
    
    // 地点名称输入框回车键搜索
    document.getElementById('placeName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.target.value.trim()) {
            e.preventDefault();
            searchLocationByName();
        }
    });
    
    // 获取当前位置
    document.getElementById('getCurrentLocation').addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                document.getElementById('placeLat').value = position.coords.latitude.toFixed(6);
                document.getElementById('placeLng').value = position.coords.longitude.toFixed(6);
                // 清除搜索标记，显示当前位置
                clearSearchMarker();
                showLocationOnMap(position.coords.latitude, position.coords.longitude);
            }, function() {
                alert('无法获取当前位置，请手动输入坐标或在地图上点击选择位置。');
            });
        } else {
            alert('您的浏览器不支持地理位置功能。');
        }
    });
    
    // 筛选按钮
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderPlacesList();
            updateMapMarkers();
        });
    });
    
    // 坐标输入框改变时，如果坐标有效则在地图上显示预览（延迟绑定，因为元素可能在模态框中）
    setTimeout(function() {
        const placeLat = document.getElementById('placeLat');
        const placeLng = document.getElementById('placeLng');
        if (placeLat) placeLat.addEventListener('blur', updateMapPreview);
        if (placeLng) placeLng.addEventListener('blur', updateMapPreview);
    }, 100);
}

// 处理头像上传
function handleAvatarUpload(event, userId) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            users[userId].avatar = e.target.result;
            saveUsers();
        };
        reader.readAsDataURL(file);
    } else {
        alert('请选择图片文件！');
    }
}

// 更新地图预览（当坐标输入框有值时）
function updateMapPreview() {
    const lat = parseFloat(document.getElementById('placeLat').value);
    const lng = parseFloat(document.getElementById('placeLng').value);
    
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        showLocationOnMap(lat, lng);
    }
}

// 通过坐标获取国家信息（反向地理编码）
async function getCountryFromCoordinates(lat, lng, retryCount = 0) {
    try {
        // 添加延迟以避免API限制
        if (retryCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
        
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=0&addressdetails=1&accept-language=en`,
            {
                headers: {
                    'User-Agent': 'TravelMapApp/1.0'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data && data.address) {
            // 优先使用country，如果没有则使用country_code
            const country = data.address.country || data.address.country_code;
            if (country) {
                return country;
            }
        }
        
        // 如果第一次失败，重试一次
        if (retryCount < 1) {
            return await getCountryFromCoordinates(lat, lng, retryCount + 1);
        }
        
        return '未知';
    } catch (error) {
        console.error('获取国家信息失败:', error);
        // 如果第一次失败，重试一次
        if (retryCount < 1) {
            return await getCountryFromCoordinates(lat, lng, retryCount + 1);
        }
        return '未知';
    }
}

// 保存地点
async function savePlace() {
    try {
        console.log('开始保存地点...');
        const name = document.getElementById('placeName').value.trim();
        const type = document.getElementById('placeType').value;
        const notes = document.getElementById('placeNotes').value.trim();
        
        // 处理日期：支持只选年份、年月、或完整日期
        let date = '';
        const year = document.getElementById('placeDateYear').value;
        const month = document.getElementById('placeDateMonth').value;
        const fullDate = document.getElementById('placeDate').value;
        
        if (fullDate) {
            // 如果选择了完整日期，使用完整日期
            date = fullDate;
        } else if (year && month) {
            // 如果选择了年月，使用年月（日期设为1号）
            date = `${year}-${month.padStart(2, '0')}-01`;
        } else if (year) {
            // 如果只选择了年份，使用年份（月份和日期设为1月1日）
            date = `${year}-01-01`;
        }
        
        const lat = parseFloat(document.getElementById('placeLat').value);
        const lng = parseFloat(document.getElementById('placeLng').value);
        const userRadio = document.querySelector('input[name="placeUser"]:checked');
        
        if (!name || isNaN(lat) || isNaN(lng)) {
            alert('请填写完整信息！需要填写地点名称和坐标。');
            return;
        }
        
        if (!userRadio) {
            alert('请选择添加者！');
            return;
        }
        
        const userId = userRadio.value;
        
        // 获取国家信息（如果是新地点或国家信息不存在）
        let country = '未知';
        console.log('获取国家信息...');
        if (editingPlaceId) {
            // 编辑现有地点，保留原有国家信息，如果没有则获取
            const existingPlace = places.find(p => p.id === editingPlaceId);
            if (existingPlace && existingPlace.country && existingPlace.country !== '未知') {
                country = existingPlace.country;
            } else {
                country = await getCountryFromCoordinates(lat, lng);
            }
        } else {
            // 新地点，获取国家信息
            country = await getCountryFromCoordinates(lat, lng);
        }
        console.log('国家信息:', country);
        
        // 检查是否有重复地点（坐标相近或名称相同）
        let existingPlace = null;
        if (!editingPlaceId) {
            // 只在新添加时检查重复，编辑时不检查
            existingPlace = places.find(p => {
                // 检查名称是否相同（忽略大小写和空格）
                const nameMatch = p.name.toLowerCase().trim() === name.toLowerCase().trim();
                
                // 检查坐标是否相近（距离小于0.1度，约11公里）
                const distance = Math.sqrt(
                    Math.pow(p.lat - lat, 2) + Math.pow(p.lng - lng, 2)
                );
                const coordClose = distance < 0.1;
                
                // 如果名称相同，或者坐标非常接近（小于0.01度约1公里），都认为是重复
                return nameMatch || coordClose;
            });
        }
        
        if (existingPlace && !editingPlaceId) {
            // 发现重复地点，合并用户
            if (!existingPlace.userIds) {
                // 兼容旧数据：将单个userId转换为userIds数组
                existingPlace.userIds = [existingPlace.userId || 'user1'];
                delete existingPlace.userId;
            }
            
            // 如果当前用户不在列表中，添加进去
            if (!existingPlace.userIds.includes(userId)) {
                existingPlace.userIds.push(userId);
                // 合并备注（如果新备注不为空）
                if (notes && notes.trim()) {
                    if (existingPlace.notes && existingPlace.notes.trim()) {
                        existingPlace.notes = existingPlace.notes + '\n\n' + notes;
                    } else {
                        existingPlace.notes = notes;
                    }
                }
                // 更新时间为最新的
                existingPlace.updatedAt = Date.now();
                console.log('合并到现有地点:', existingPlace.name, '用户:', existingPlace.userIds);
                // 保存并刷新，但不添加新地点
                savePlaces();
                renderPlacesList();
                updateMapMarkers();
                syncToSharedStorage();
                closeModal();
                alert(`已合并到现有地点"${existingPlace.name}"，现在显示我们都去过！`);
                return; // 不继续添加新地点
            } else {
                console.log('用户已在该地点中');
                alert(`您已经添加过地点"${existingPlace.name}"了！`);
                closeModal();
                return;
            }
        } else {
            // 新地点或编辑现有地点
            const place = {
                id: editingPlaceId || Date.now().toString(),
                name: name,
                type: type,
                notes: notes,
                date: date,
                lat: lat,
                lng: lng,
                userIds: [userId], // 使用数组支持多个用户
                country: country, // 添加国家信息
                updatedAt: Date.now() // 添加更新时间戳
            };
            
            if (editingPlaceId) {
                // 更新现有地点
                const index = places.findIndex(p => p.id === editingPlaceId);
                if (index !== -1) {
                    // 保留原有的userIds
                    const oldPlace = places[index];
                    if (oldPlace.userIds && Array.isArray(oldPlace.userIds)) {
                        place.userIds = oldPlace.userIds;
                        // 如果当前用户不在列表中，添加进去
                        if (!place.userIds.includes(userId)) {
                            place.userIds.push(userId);
                        }
                    }
                    places[index] = place;
                    console.log('更新地点:', place.name);
                }
            } else {
                // 添加新地点
                places.push(place);
                console.log('添加新地点:', place.name);
            }
        }
        
        savePlaces();
        renderPlacesList();
        updateMapMarkers();
        syncToSharedStorage(); // 同步到共享存储
        console.log('地点保存成功');
        closeModal();
    } catch (error) {
        console.error('保存地点时出错:', error);
        alert('保存失败：' + (error.message || '未知错误，请查看控制台'));
        throw error;
    }
}

// 获取地点的用户列表（兼容旧数据）
function getPlaceUsers(place) {
    if (place.userIds && Array.isArray(place.userIds)) {
        return place.userIds;
    }
    // 兼容旧数据
    if (place.userId) {
        return [place.userId];
    }
    return ['user1'];
}

// 删除地点
function deletePlace(id) {
    places = places.filter(p => p.id !== id);
    savePlaces();
    renderPlacesList();
    updateMapMarkers();
}

// 编辑地点
function editPlace(id) {
    const place = places.find(p => p.id === id);
    if (!place) return;
    
    editingPlaceId = id;
    document.getElementById('modalTitle').textContent = '编辑地点';
    document.getElementById('placeName').value = place.name;
    document.getElementById('placeType').value = place.type;
    document.getElementById('placeNotes').value = place.notes || '';
    
    // 处理日期显示：如果只有年份，显示在年份选择器中
    if (place.date) {
        const dateObj = new Date(place.date);
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        
        // 检查是否是1月1日（可能只是年份）
        if (day === 1 && month === 1) {
            document.getElementById('placeDateYear').value = year;
            document.getElementById('placeDateMonth').value = '';
            document.getElementById('placeDate').value = '';
        } else if (day === 1) {
            // 只有年月（1号）
            document.getElementById('placeDateYear').value = year;
            document.getElementById('placeDateMonth').value = month.toString().padStart(2, '0');
            document.getElementById('placeDate').value = '';
        } else {
            // 完整日期
            document.getElementById('placeDateYear').value = '';
            document.getElementById('placeDateMonth').value = '';
            document.getElementById('placeDate').value = place.date;
        }
    } else {
        document.getElementById('placeDateYear').value = '';
        document.getElementById('placeDateMonth').value = '';
        document.getElementById('placeDate').value = '';
    }
    
    document.getElementById('placeLat').value = place.lat;
    document.getElementById('placeLng').value = place.lng;
    // 设置用户选择（如果有多个用户，选择第一个）
    const placeUsers = getPlaceUsers(place);
    const firstUserId = placeUsers[0] || 'user1';
    document.querySelector(`input[name="placeUser"][value="${firstUserId}"]`).checked = true;
    document.getElementById('deleteBtn').style.display = 'block';
    const placeModal = document.getElementById('placeModal');
    if (placeModal) {
        placeModal.style.display = 'flex';
        placeModal.style.position = 'fixed';
        placeModal.style.top = '0';
        placeModal.style.left = '0';
        placeModal.style.width = '100%';
        placeModal.style.height = '100%';
        placeModal.style.zIndex = '10000';
        placeModal.classList.add('show');
    }
}

// 显示地点详情
function showPlaceDetails(id) {
    const place = places.find(p => p.id === id);
    if (!place) return;
    
    const details = document.getElementById('placeDetails');
    const typeText = place.type === 'visited' ? '已去过' : '想去';
    const typeClass = place.type === 'visited' ? 'visited' : 'wishlist';
    const placeUsers = getPlaceUsers(place);
    
    // 生成用户显示HTML
    let usersHtml = '';
    if (placeUsers.length > 1) {
        usersHtml = '<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;"><span class="detail-label">我们都去过：</span>';
        placeUsers.forEach(userId => {
            const userData = users[userId] || users.user1;
            const userAvatar = userData.avatar || getDefaultAvatar(userId);
            const userName = userData.name || (userId === 'user1' ? '用户1' : '用户2');
            usersHtml += `<div style="display: flex; align-items: center; gap: 4px;"><img src="${userAvatar}" alt="${userName}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid ${userId === 'user1' ? '#667eea' : '#764ba2'};"><span>${userName}</span></div>`;
        });
        usersHtml += '</div>';
    } else {
        const userId = placeUsers[0] || 'user1';
        const userData = users[userId] || users.user1;
        const userAvatar = userData.avatar || getDefaultAvatar(userId);
        const userName = userData.name || (userId === 'user1' ? '用户1' : '用户2');
        usersHtml = `<p style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;"><span class="detail-label">添加者：</span><img src="${userAvatar}" alt="${userName}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;"><span>${userName}</span></p>`;
    }
    
    details.innerHTML = `
        <div class="detail-section">
            <h3>${place.name}</h3>
            ${usersHtml}
            <p><span class="detail-label">类型：</span><span class="place-item-type ${typeClass}">${typeText}</span></p>
            ${place.date ? `<p><span class="detail-label">日期：</span>${formatDate(place.date)}</p>` : ''}
            <p><span class="detail-label">坐标：</span>${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}</p>
            ${place.notes ? `<p><span class="detail-label">备注：</span></p><p>${place.notes}</p>` : '<p style="color: #999; font-style: italic;">暂无备注</p>'}
        </div>
        <div class="form-actions">
            <button onclick="editPlace('${place.id}'); closeDetailModal();" class="btn btn-primary">编辑</button>
            <button onclick="map.setView([${place.lat}, ${place.lng}], 10); closeDetailModal();" class="btn btn-secondary">定位</button>
            <button onclick="if(confirm('确定要删除这个地点吗？')) { deletePlace('${place.id}'); closeDetailModal(); }" class="btn btn-danger">删除</button>
        </div>
    `;
    
    const detailModal = document.getElementById('detailModal');
    if (detailModal) {
        detailModal.style.display = 'flex';
        detailModal.classList.add('show');
    }
}

// 关闭模态框
function closeModal() {
    console.log('关闭模态框...');
    const placeModal = document.getElementById('placeModal');
    if (placeModal) {
        placeModal.classList.remove('show');
        placeModal.style.display = 'none';
        placeModal.style.zIndex = '';
        console.log('模态框已关闭');
    }
    editingPlaceId = null;
    clearSearchMarker();
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('show');
}

// 渲染地点列表
function renderPlacesList() {
    const list = document.getElementById('placesList');
    let filteredPlaces = places.filter(place => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'user') {
            const placeUsers = getPlaceUsers(place);
            return placeUsers.includes(currentUser);
        }
        return place.type === currentFilter;
    });
    
    if (filteredPlaces.length === 0) {
        list.innerHTML = '<p class="empty-message">暂无地点记录</p>';
        return;
    }
    
    // 按日期排序（已去过的优先，然后按日期）
    filteredPlaces.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === 'visited' ? -1 : 1;
        }
        if (a.date && b.date) {
            return new Date(b.date) - new Date(a.date);
        }
        return 0;
    });
    
    // 按照国家分组
    const placesByCountry = {};
    filteredPlaces.forEach(place => {
        const country = place.country || '未知';
        if (!placesByCountry[country]) {
            placesByCountry[country] = [];
        }
        placesByCountry[country].push(place);
    });
    
    // 按国家名称排序
    const sortedCountries = Object.keys(placesByCountry).sort();
    
    // 生成HTML
    let html = '';
    sortedCountries.forEach(country => {
        const countryPlaces = placesByCountry[country];
        const countryId = 'country-' + country.replace(/\s+/g, '-');
        
        html += `
            <div class="country-group">
                <div class="country-header" onclick="toggleCountryGroup('${countryId}')">
                    <span class="country-name">${country}</span>
                    <span class="country-count">${countryPlaces.length} 个地点</span>
                    <span class="country-toggle" id="toggle-${countryId}">▼</span>
                </div>
                <div class="country-places" id="${countryId}">
                    ${countryPlaces.map(place => {
                        const typeText = place.type === 'visited' ? '已去过' : '想去';
                        const dateText = place.date ? formatDate(place.date) : '';
                        const placeUsers = getPlaceUsers(place);
                        
                        // 生成用户头像HTML
                        let avatarsHtml = '';
                        if (placeUsers.length > 1) {
                            // 多个用户，显示所有头像
                            avatarsHtml = placeUsers.map(userId => {
                                const userData = users[userId] || users.user1;
                                const userAvatar = userData.avatar || getDefaultAvatar(userId);
                                return `<img src="${userAvatar}" alt="" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid ${userId === 'user1' ? '#667eea' : '#764ba2'}; flex-shrink: 0;">`;
                            }).join('');
                        } else {
                            // 单个用户
                            const userId = placeUsers[0] || 'user1';
                            const userData = users[userId] || users.user1;
                            const userAvatar = userData.avatar || getDefaultAvatar(userId);
                            avatarsHtml = `<img src="${userAvatar}" alt="" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 2px solid ${userId === 'user1' ? '#667eea' : '#764ba2'}; flex-shrink: 0;">`;
                        }
                        
                        return `
                            <div class="place-item ${place.type}" onclick="showPlaceDetails('${place.id}')">
                                <div class="place-item-header">
                                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                                        <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                                            ${avatarsHtml}
                                            ${placeUsers.length > 1 ? '<span style="font-size: 12px; color: #667eea; font-weight: 600;">我们都去过</span>' : ''}
                                        </div>
                                        <div class="place-item-name" style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${place.name}</div>
                                    </div>
                                    <span class="place-item-type ${place.type}" style="flex-shrink: 0; margin-left: 8px;">${typeText}</span>
                                </div>
                                ${dateText ? `<div class="place-item-date">${dateText}</div>` : ''}
                                ${place.notes ? `<div class="place-item-notes">${place.notes}</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });
    
    list.innerHTML = html;
}

// 切换国家分组展开/折叠
function toggleCountryGroup(countryId) {
    const countryPlaces = document.getElementById(countryId);
    const toggle = document.getElementById('toggle-' + countryId);
    
    if (!countryPlaces || !toggle) return;
    
    if (countryPlaces.style.display === 'none') {
        countryPlaces.style.display = 'block';
        toggle.textContent = '▼';
    } else {
        countryPlaces.style.display = 'none';
        toggle.textContent = '▶';
    }
}

// 更新地图标记
function updateMapMarkers() {
    // 清除现有标记
    Object.values(markers).forEach(marker => map.removeLayer(marker));
    markers = {};
    
    // 添加标记
    places.forEach(place => {
        const placeUsers = getPlaceUsers(place);
        
        if (currentFilter === 'user' && !placeUsers.includes(currentUser)) {
            return;
        }
        if (currentFilter !== 'all' && currentFilter !== 'user' && place.type !== currentFilter) {
            return;
        }
        
        // 创建带用户头像的自定义图标
        const borderColor = place.type === 'visited' ? '#51cf66' : '#ffd43b';
        let iconHtml = '';
        let popupUsersHtml = '';
        
        if (placeUsers.length > 1) {
            // 多个用户，显示两个头像重叠
            const user1Id = placeUsers[0] || 'user1';
            const user2Id = placeUsers[1] || 'user2';
            const user1Data = users[user1Id] || users.user1;
            const user2Data = users[user2Id] || users.user2;
            const user1Avatar = user1Data.avatar || getDefaultAvatar(user1Id);
            const user2Avatar = user2Data.avatar || getDefaultAvatar(user2Id);
            const user1Name = user1Data.name || (user1Id === 'user1' ? '用户1' : '用户2');
            const user2Name = user2Data.name || (user2Id === 'user1' ? '用户1' : '用户2');
            
            iconHtml = `
                <div style="position: relative;">
                    <div style="display: flex; align-items: center; gap: -8px;">
                        <img src="${user1Avatar}" style="width: 28px; height: 28px; border-radius: 50%; border: 3px solid ${borderColor}; object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.3); z-index: 2;">
                        <img src="${user2Avatar}" style="width: 28px; height: 28px; border-radius: 50%; border: 3px solid ${borderColor}; object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.3); margin-left: -12px; z-index: 1;">
                    </div>
                    ${place.type === 'visited' ? '<div style="position: absolute; bottom: -2px; right: -2px; width: 14px; height: 14px; background: #51cf66; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 8px; color: white;">✓</div>' : ''}
                </div>
            `;
            
            popupUsersHtml = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin: 5px 0; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <img src="${user1Avatar}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;">
                        <small>${user1Name}</small>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <img src="${user2Avatar}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;">
                        <small>${user2Name}</small>
                    </div>
                </div>
                <div style="color: #667eea; font-weight: 600; font-size: 12px; margin: 5px 0;">我们都去过</div>
            `;
        } else {
            // 单个用户
            const userId = placeUsers[0] || 'user1';
            const userData = users[userId] || users.user1;
            const userAvatar = userData.avatar || getDefaultAvatar(userId);
            const userName = userData.name || (userId === 'user1' ? '用户1' : '用户2');
            
            iconHtml = `
                <div style="position: relative;">
                    <img src="${userAvatar}" style="width: 32px; height: 32px; border-radius: 50%; border: 3px solid ${borderColor}; object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                    ${place.type === 'visited' ? '<div style="position: absolute; bottom: -2px; right: -2px; width: 14px; height: 14px; background: #51cf66; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 8px; color: white;">✓</div>' : ''}
                </div>
            `;
            
            popupUsersHtml = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin: 5px 0;">
                    <img src="${userAvatar}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;">
                    <small>${userName}</small>
                </div>
            `;
        }
        
        const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });
        
        const marker = L.marker([place.lat, place.lng], { icon: customIcon })
            .addTo(map)
            .bindPopup(`
                <div style="text-align: center; min-width: 150px;">
                    <strong>${place.name}</strong><br>
                    ${popupUsersHtml}
                    <span style="color: ${place.type === 'visited' ? '#51cf66' : '#ffd43b'};">
                        ${place.type === 'visited' ? '已去过' : '想去'}
                    </span>
                    ${place.date ? `<br><small>${formatDate(place.date)}</small>` : ''}
                </div>
            `);
        
        marker.on('click', function() {
            showPlaceDetails(place.id);
        });
        
        markers[place.id] = marker;
    });
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 如果是1月1日，可能只是年份
    if (month === 1 && day === 1) {
        return year + '年';
    }
    // 如果是1号，可能只有年月
    if (day === 1) {
        return year + '年' + month + '月';
    }
    // 完整日期
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// 合并已有的重复地点
function mergeDuplicatePlaces() {
    console.log('开始合并重复地点...');
    const merged = [];
    const processed = new Set();
    let mergedCount = 0;
    
    places.forEach((place, index) => {
        if (processed.has(index)) return;
        
        // 查找所有重复的地点
        const duplicates = [place];
        const duplicateIndices = [index];
        
        for (let i = index + 1; i < places.length; i++) {
            if (processed.has(i)) continue;
            
            const otherPlace = places[i];
            // 检查名称是否相同（忽略大小写和空格）
            const nameMatch = place.name.toLowerCase().trim() === otherPlace.name.toLowerCase().trim();
            
            // 检查坐标是否相近（距离小于0.1度，约11公里）
            const distance = Math.sqrt(
                Math.pow(place.lat - otherPlace.lat, 2) + Math.pow(place.lng - otherPlace.lng, 2)
            );
            const coordClose = distance < 0.1;
            
            if (nameMatch || coordClose) {
                duplicates.push(otherPlace);
                duplicateIndices.push(i);
            }
        }
        
        if (duplicates.length > 1) {
            // 合并重复地点
            const mergedPlace = { ...duplicates[0] };
            
            // 合并userIds
            if (!mergedPlace.userIds) {
                mergedPlace.userIds = getPlaceUsers(mergedPlace);
            }
            
            duplicates.slice(1).forEach(dup => {
                const dupUserIds = getPlaceUsers(dup);
                dupUserIds.forEach(dupUserId => {
                    if (!mergedPlace.userIds.includes(dupUserId)) {
                        mergedPlace.userIds.push(dupUserId);
                    }
                });
                
                // 合并备注
                if (dup.notes && dup.notes.trim()) {
                    if (mergedPlace.notes && mergedPlace.notes.trim()) {
                        mergedPlace.notes = mergedPlace.notes + '\n\n' + dup.notes;
                    } else {
                        mergedPlace.notes = dup.notes;
                    }
                }
            });
            
            mergedPlace.updatedAt = Date.now();
            merged.push(mergedPlace);
            duplicateIndices.forEach(idx => processed.add(idx));
            mergedCount += duplicates.length - 1;
            console.log(`合并了 ${duplicates.length} 个重复地点: ${mergedPlace.name}，用户: ${mergedPlace.userIds.join(', ')}`);
        } else {
            // 没有重复，直接添加
            merged.push(place);
            processed.add(index);
        }
    });
    
    if (mergedCount > 0) {
        places = merged;
        savePlaces();
        renderPlacesList();
        updateMapMarkers();
        console.log(`合并完成，共合并了 ${mergedCount} 个重复地点`);
    } else {
        console.log('没有发现重复地点');
    }
}

// 保存地点到localStorage并同步到共享存储
function savePlaces() {
    localStorage.setItem('travelPlaces', JSON.stringify(places));
    syncToSharedStorage();
}

// 从localStorage加载地点
// 批量更新缺失的国家信息
async function updateMissingCountries() {
    const placesNeedingUpdate = places.filter(place => 
        (!place.country || place.country === '未知' || place.country === '加载中...') && 
        place.lat && place.lng
    );
    
    if (placesNeedingUpdate.length === 0) {
        return;
    }
    
    console.log(`开始更新 ${placesNeedingUpdate.length} 个地点的国家信息...`);
    
    // 逐个更新，添加延迟以避免API限制
    for (let i = 0; i < placesNeedingUpdate.length; i++) {
        const place = placesNeedingUpdate[i];
        // 添加延迟（每1秒更新一个）
        if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const country = await getCountryFromCoordinates(place.lat, place.lng);
        place.country = country;
        
        // 每更新5个地点就保存一次并刷新显示
        if ((i + 1) % 5 === 0 || i === placesNeedingUpdate.length - 1) {
            savePlaces();
            renderPlacesList();
        }
    }
    
    savePlaces();
    renderPlacesList();
    console.log('国家信息更新完成');
}

function loadPlaces() {
    const saved = localStorage.getItem('travelPlaces');
    if (saved) {
        try {
            places = JSON.parse(saved);
            // 为旧数据添加默认userId和country
            places = places.map(place => {
                // 兼容旧数据：将userId转换为userIds数组
                if (!place.userIds) {
                    if (place.userId) {
                        place.userIds = [place.userId];
                        delete place.userId;
                    } else {
                        place.userIds = ['user1'];
                    }
                }
                // 如果旧数据没有country字段，标记为需要更新
                if (!place.country && place.lat && place.lng) {
                    place.country = '未知'; // 先显示未知，稍后批量更新
                } else if (!place.country) {
                    place.country = '未知';
                }
                return place;
            });
            renderPlacesList();
            if (map) {
                updateMapMarkers();
            }
            
            // 合并已有的重复地点
            mergeDuplicatePlaces();
            
            // 延迟批量更新缺失的国家信息（避免阻塞页面加载）
            setTimeout(() => {
                updateMissingCountries();
            }, 2000);
        } catch (e) {
            console.error('加载数据失败:', e);
        }
    }
}

// 导出数据（包含所有地点和用户信息）
function exportData() {
    const exportData = {
        places: places,
        users: users,
        exportDate: new Date().toISOString()
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `travel-map-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    alert('数据已导出！\n\n文件包含：\n- 所有地点记录\n- 用户信息（名称和头像）\n\n你可以将这个文件发送给对方，让对方导入即可看到你的数据。');
}

// 导入数据（合并数据，不覆盖现有数据）
function importData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            let importedPlaces = [];
            let importedUsers = null;
            
            // 支持新旧两种格式
            if (Array.isArray(imported)) {
                // 旧格式：只有地点数组
                importedPlaces = imported;
            } else if (imported.places && Array.isArray(imported.places)) {
                // 新格式：包含地点和用户信息
                importedPlaces = imported.places;
                importedUsers = imported.users;
            } else {
                alert('数据格式不正确！');
                return;
            }
            
            // 合并地点数据（避免重复）
            const existingIds = new Set(places.map(p => p.id));
            let newPlacesCount = 0;
            let updatedPlacesCount = 0;
            
            importedPlaces.forEach(place => {
                const existingIndex = places.findIndex(p => p.id === place.id);
                if (existingIndex !== -1) {
                    // 如果ID已存在，更新数据
                    places[existingIndex] = place;
                    updatedPlacesCount++;
                } else {
                    // 新地点，添加
                    places.push(place);
                    newPlacesCount++;
                }
            });
            
            // 合并用户信息（如果导入的数据包含用户信息）
            if (importedUsers) {
                if (importedUsers.user1 && importedUsers.user1.name) {
                    if (!users.user1.name || users.user1.name === '用户1') {
                        users.user1.name = importedUsers.user1.name;
                    }
                    if (importedUsers.user1.avatar && !users.user1.avatar) {
                        users.user1.avatar = importedUsers.user1.avatar;
                    }
                }
                if (importedUsers.user2 && importedUsers.user2.name) {
                    if (!users.user2.name || users.user2.name === '用户2') {
                        users.user2.name = importedUsers.user2.name;
                    }
                    if (importedUsers.user2.avatar && !users.user2.avatar) {
                        users.user2.avatar = importedUsers.user2.avatar;
                    }
                }
                saveUsers();
            }
            
            savePlaces();
            renderPlacesList();
            updateMapMarkers();
            
            alert(`数据导入成功！\n\n新增地点：${newPlacesCount} 个\n更新地点：${updatedPlacesCount} 个\n总计地点：${places.length} 个`);
        } catch (e) {
            alert('导入失败：' + e.message);
        }
    };
    reader.readAsText(file);
}

// 根据名称搜索地点坐标（地理编码）
async function searchLocationByName() {
    const placeName = document.getElementById('placeName').value.trim();
    
    if (!placeName) {
        alert('请输入地点名称！');
        return;
    }
    
    const searchBtn = document.getElementById('searchLocationBtn');
    const originalText = searchBtn.innerHTML;
    searchBtn.disabled = true;
    searchBtn.innerHTML = '🔍 搜索中...';
    
    try {
        // 使用OpenStreetMap Nominatim API进行地理编码（英文）
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&limit=1&accept-language=en`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'TravelMapApp/1.0' // Nominatim要求设置User-Agent
            }
        });
        
        if (!response.ok) {
            throw new Error('搜索失败，请稍后重试');
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);
            
            // 填充坐标
            document.getElementById('placeLat').value = lat.toFixed(6);
            document.getElementById('placeLng').value = lng.toFixed(6);
            
            // 在地图上显示位置
            showLocationOnMap(lat, lng);
            
            // 如果地点名称与搜索结果不同，可以更新名称（可选）
            const displayName = result.display_name.split(',')[0]; // 使用更简洁的名称
            if (displayName && displayName !== placeName) {
                // 可以选择是否自动更新名称，这里先不自动更新，让用户决定
            }
            
            searchBtn.innerHTML = '✅ 已找到';
            setTimeout(() => {
                searchBtn.innerHTML = originalText;
            }, 2000);
        } else {
            alert('未找到该地点，请尝试使用更具体的地点名称（如：北京、Paris、Tokyo）或手动输入坐标。');
            searchBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('地理编码错误:', error);
        alert('搜索失败：' + error.message + '\n\n请尝试：\n1. 检查网络连接\n2. 使用更具体的地点名称\n3. 手动输入坐标或在地图上点击选择位置');
        searchBtn.innerHTML = originalText;
    } finally {
        searchBtn.disabled = false;
    }
}

// 在地图上显示位置
function showLocationOnMap(lat, lng) {
    // 清除之前的搜索标记
    clearSearchMarker();
    
    // 创建临时标记显示搜索结果
    const tempIcon = L.divIcon({
        html: '<div style="background-color: #667eea; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        className: 'temp-search-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    
    searchMarker = L.marker([lat, lng], { icon: tempIcon })
        .addTo(map)
        .bindPopup('搜索结果位置')
        .openPopup();
    
    // 移动地图视图到该位置
    map.setView([lat, lng], 10);
}

// 清除搜索标记
function clearSearchMarker() {
    if (searchMarker) {
        map.removeLayer(searchMarker);
        searchMarker = null;
    }
}

// ========== 自动同步功能 ==========

// 从云端加载数据（简单API方式）
async function loadFromCloud() {
    if (!syncApiUrl) return;
    
    try {
        let response;
        let data;
        
        // GitHub Gist 方式
        if (syncApiUrl.includes('gist.githubusercontent.com')) {
            response = await fetch(syncApiUrl);
            if (response.ok) {
                const text = await response.text();
                data = JSON.parse(text);
            }
        }
        // JSONBin.io 方式
        else if (syncApiUrl.includes('jsonbin.io')) {
            response = await fetch(`${syncApiUrl}/latest`, {
                headers: {
                    'X-Master-Key': localStorage.getItem('travelMapApiKey') || '$2b$10$your-key-here'
                }
            });
            if (response.ok) {
                const result = await response.json();
                data = result.record || result;
            }
        }
        
        if (data && data.roomId === roomId) {
            mergeCloudData(data);
            updateSyncStatus('已同步（云端）');
        }
    } catch (error) {
        console.error('加载云端数据失败:', error);
        // 失败时不影响使用
    }
}

// 同步到云端（简单API方式）
async function syncToCloud() {
    if (!syncApiUrl) {
        syncToSharedStorage();
        return;
    }
    
    try {
        const syncData = {
            roomId: roomId,
            places: places,
            users: users,
            timestamp: Date.now(),
            lastUpdatedBy: currentUser
        };
        
        let response;
        
        // GitHub Gist 方式（使用GitHub API写入）
        if (syncApiUrl.includes('gist.githubusercontent.com')) {
            const gistId = syncApiUrl.match(/gist\.githubusercontent\.com\/[^\/]+\/([^\/]+)/)?.[1];
            const githubToken = localStorage.getItem('travelMapGithubToken');
            
            if (gistId && githubToken) {
                try {
                    // 使用GitHub API更新Gist
                    response = await fetch(`https://api.github.com/gists/${gistId}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `token ${githubToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/vnd.github.v3+json'
                        },
                        body: JSON.stringify({
                            files: {
                                'travel-map-data.json': {
                                    content: JSON.stringify(syncData, null, 2)
                                }
                            }
                        })
                    });
                    
                    if (response.ok) {
                        updateSyncStatus('已同步（云端）');
                        return;
                    } else {
                        const errorData = await response.json();
                        console.error('GitHub API错误:', errorData);
                        throw new Error('GitHub API同步失败');
                    }
                } catch (error) {
                    console.error('GitHub API同步错误:', error);
                    // 失败时回退到本地存储
                    syncToSharedStorage();
                    return;
                }
            } else {
                // 没有token，使用只读模式
                console.log('GitHub Gist是只读的，请配置GitHub Token或使用导出/导入功能');
                // 不调用syncToSharedStorage，因为Gist只读模式下不需要写入
                updateSyncStatus('已同步（Gist只读）');
                return;
            }
        }
        // JSONBin.io 方式
        else if (syncApiUrl.includes('jsonbin.io')) {
            const apiKey = localStorage.getItem('travelMapApiKey');
            response = await fetch(syncApiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': apiKey || '$2b$10$your-key-here'
                },
                body: JSON.stringify(syncData)
            });
        }
        
        if (response && response.ok) {
            updateSyncStatus('已同步（云端）');
        } else {
            throw new Error('同步失败');
        }
    } catch (error) {
        console.error('云端同步失败:', error);
        updateSyncStatus('同步失败');
        // 失败时回退到本地存储
        syncToSharedStorage();
    }
}

// 合并云端数据
function mergeCloudData(data) {
    let hasChanges = false;
    
    // 合并地点数据
    if (data.places && Array.isArray(data.places)) {
        const existingIds = new Set(places.map(p => p.id));
        
        data.places.forEach(place => {
            if (!existingIds.has(place.id)) {
                places.push(place);
                hasChanges = true;
            } else {
                const index = places.findIndex(p => p.id === place.id);
                if (index !== -1) {
                    const existingPlace = places[index];
                    const existingTimestamp = existingPlace.updatedAt || 0;
                    const newTimestamp = place.updatedAt || 0;
                    if (newTimestamp > existingTimestamp) {
                        places[index] = place;
                        hasChanges = true;
                    }
                }
            }
        });
    }
    
    // 合并用户信息
    if (data.users) {
        if (data.users.user1 && data.users.user1.name && (!users.user1.name || users.user1.name === '用户1')) {
            users.user1.name = data.users.user1.name;
            if (data.users.user1.avatar) users.user1.avatar = data.users.user1.avatar;
            hasChanges = true;
        }
        if (data.users.user2 && data.users.user2.name && (!users.user2.name || users.user2.name === '用户2')) {
            users.user2.name = data.users.user2.name;
            if (data.users.user2.avatar) users.user2.avatar = data.users.user2.avatar;
            hasChanges = true;
        }
    }
    
    if (hasChanges) {
        localStorage.setItem('travelPlaces', JSON.stringify(places));
        saveUsers();
        renderPlacesList();
        if (map) {
            updateMapMarkers();
        }
        updateUserDisplay();
        updateUserAvatars();
    }
}

// 同步到共享存储（优先使用云端，失败时使用localStorage）
function syncToSharedStorage() {
    if (syncApiUrl) {
        syncToCloud();
    } else {
        try {
            const syncData = {
                places: places,
                users: users,
                timestamp: Date.now()
            };
            // 使用localStorage的共享key（你们两个使用相同的key）
            localStorage.setItem(syncStorageKey, JSON.stringify(syncData));
            updateSyncStatus('已同步（本地）');
        } catch (e) {
            console.error('同步失败:', e);
            updateSyncStatus('同步失败');
        }
    }
}

// 从共享存储加载数据
function loadFromSharedStorage() {
    try {
        const sharedData = localStorage.getItem(syncStorageKey);
        if (sharedData) {
            const data = JSON.parse(sharedData);
            let hasChanges = false;
            
            // 合并地点数据
            if (data.places && Array.isArray(data.places)) {
                const existingIds = new Set(places.map(p => p.id));
                data.places.forEach(place => {
                    if (!existingIds.has(place.id)) {
                        places.push(place);
                        hasChanges = true;
                    } else {
                        // 更新已有地点（如果时间戳更新）
                        const index = places.findIndex(p => p.id === place.id);
                        if (index !== -1) {
                            const existingPlace = places[index];
                            const existingTimestamp = existingPlace.updatedAt || 0;
                            const newTimestamp = place.updatedAt || data.timestamp || 0;
                            if (newTimestamp > existingTimestamp) {
                                places[index] = place;
                                hasChanges = true;
                            }
                        }
                    }
                });
            }
            
            // 合并用户信息
            if (data.users) {
                if (data.users.user1 && data.users.user1.name && (!users.user1.name || users.user1.name === '用户1')) {
                    users.user1.name = data.users.user1.name;
                    if (data.users.user1.avatar) users.user1.avatar = data.users.user1.avatar;
                    hasChanges = true;
                }
                if (data.users.user2 && data.users.user2.name && (!users.user2.name || users.user2.name === '用户2')) {
                    users.user2.name = data.users.user2.name;
                    if (data.users.user2.avatar) users.user2.avatar = data.users.user2.avatar;
                    hasChanges = true;
                }
                if (hasChanges) {
                    saveUsers();
                }
            }
            
            if (hasChanges) {
                savePlaces();
                renderPlacesList();
                if (map) {
                    updateMapMarkers();
                }
                updateSyncStatus('已同步');
            } else {
                updateSyncStatus('已同步');
            }
        }
    } catch (e) {
        console.error('加载共享数据失败:', e);
        updateSyncStatus('同步失败');
    }
}

// 启动自动同步
function startAutoSync() {
    if (syncApiUrl && syncApiUrl.includes('gist.githubusercontent.com')) {
        const githubToken = localStorage.getItem('travelMapGithubToken');
        
        if (githubToken) {
            // 有Token，可以写入，使用真正的自动同步
            syncInterval = setInterval(function() {
                loadFromCloud();
            }, 10000);
            
            // 初始同步
            syncToCloud();
            loadFromCloud();
            updateSyncStatus('同步中（云端）');
        } else {
            // 没有Token，只能读取
            syncInterval = setInterval(function() {
                loadFromCloud();
            }, 10000);
            
            // 初始加载
            loadFromCloud();
            updateSyncStatus('已同步（Gist只读）');
        }
    } else if (syncApiUrl) {
        // 其他云端同步：每5秒检查一次
        syncInterval = setInterval(function() {
            loadFromCloud();
        }, 5000);
        
        // 初始同步
        syncToCloud();
        loadFromCloud();
        updateSyncStatus('同步中（云端）');
    } else {
        // 本地存储模式：每3秒检查一次
        syncInterval = setInterval(function() {
            loadFromSharedStorage();
        }, 3000);
        
        // 初始同步
        syncToSharedStorage();
        updateSyncStatus('同步中（本地）');
    }
}

// 停止自动同步
function stopAutoSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

// 更新同步状态显示
function updateSyncStatus(status) {
    const syncStatusEl = document.getElementById('syncStatus');
    if (syncStatusEl) {
        syncStatusEl.textContent = status;
        if (status === '已同步') {
            syncStatusEl.style.color = '#51cf66';
        } else if (status === '同步失败') {
            syncStatusEl.style.color = '#ff4757';
        } else {
            syncStatusEl.style.color = '#667eea';
        }
    }
    lastSyncTime = Date.now();
}

