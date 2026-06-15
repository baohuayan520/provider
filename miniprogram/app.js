// app.js
App({
  onLaunch: function () {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-d0g8x50g49ba70206',
        traceUser: true,
      });
    }

    // 获取系统信息
    const sysInfo = wx.getSystemInfoSync();
    this.globalData.statusBarHeight = sysInfo.statusBarHeight;
    this.globalData.screenWidth = sysInfo.screenWidth;
    this.globalData.screenHeight = sysInfo.screenHeight;

    // 检查登录状态
    this.checkLoginStatus();
  },

  globalData: {
    env: 'cloud1-d0g8x50g49ba70206',
    isLoggedIn: false,        // 是否已登录
    phone: '',                // 登录手机号
    openid: '',               // 云开发用户 openid
    userInfo: null,
    identityVerified: false,
    livenessVerified: false,
    livenessExpireDate: null,
    agreementSigned: false,
    statusBarHeight: 0,
    screenWidth: 375,
    screenHeight: 667,
  },

  // 获取当前用户 openid（缓存优先）
  getOpenid: async function () {
    if (this.globalData.openid) return this.globalData.openid;
    try {
      const res = await wx.cloud.callFunction({
        name: 'initFunctions',
        data: { action: 'getOpenid' },
      });
      if (res.result && res.result.openid) {
        this.globalData.openid = res.result.openid;
        return res.result.openid;
      }
    } catch (err) {
      console.warn('获取openid失败:', err);
    }
    return '';
  },

  // ========== 检查登录状态 ==========
  checkLoginStatus: function () {
    const loginPhone = wx.getStorageSync('loginPhone');
    if (loginPhone) {
      this.globalData.isLoggedIn = true;
      this.globalData.phone = loginPhone;
      // 异步拉取最新用户状态
      this.checkAuthStatus().catch(() => {});
    }
  },

  // ========== 登出 ==========
  logout: function () {
    this.globalData.isLoggedIn = false;
    this.globalData.phone = '';
    this.globalData.userInfo = null;
    this.globalData.identityVerified = false;
    this.globalData.livenessVerified = false;
    this.globalData.livenessExpireDate = null;
    this.globalData.agreementSigned = false;
    wx.removeStorageSync('loginPhone');
  },

  // ========== 检查用户认证状态 ==========
  checkAuthStatus: async function () {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('users').where({
        _openid: '{openid}'
      }).get();
      
      if (res.data && res.data.length > 0) {
        const user = res.data[0];
        this.globalData.userInfo = user;
        this.globalData.identityVerified = user.identityVerified;
        this.globalData.livenessVerified = user.livenessVerified;
        this.globalData.livenessExpireDate = user.livenessExpireDate;
        this.globalData.agreementSigned = user.agreementSigned;
      }
    } catch (err) {
      console.error('获取用户认证状态失败:', err);
    }
  },

  // ========== 登录守卫：未登录则跳转登录页 ==========
  requireLogin: function () {
    if (!this.globalData.isLoggedIn) {
      wx.reLaunch({ url: '/pages/login/index' });
      return false;
    }
    return true;
  },

  // 判断活体是否过期
  isLivenessExpired: function () {
    if (!this.globalData.livenessExpireDate) return true;
    const now = new Date();
    const expire = new Date(this.globalData.livenessExpireDate);
    return now > expire;
  },

  // 获取活体剩余天数
  getLivenessRemainDays: function () {
    if (!this.globalData.livenessExpireDate) return 0;
    const now = new Date();
    const expire = new Date(this.globalData.livenessExpireDate);
    const diff = expire.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },

  // 脱敏处理
  maskText: function (text, type) {
    if (!text) return '';
    switch (type) {
      case 'name':
        // 张*明
        return text.length <= 2 
          ? text[0] + '*' 
          : text[0] + '*'.repeat(text.length - 2) + text[text.length - 1];
      case 'idCard':
        // 110***********1234
        return text.slice(0, 3) + '***********' + text.slice(-4);
      case 'phone':
        // 138****5678
        return text.slice(0, 3) + '****' + text.slice(-4);
      case 'bankCard':
        // 6228****8888
        return text.slice(0, 4) + ' **** ' + text.slice(-4);
      case 'enterprise':
        // 腾讯***限公司（前二后三）
        return text.length <= 5
          ? text
          : text.slice(0, 2) + '***' + text.slice(-3);
      default:
        return text;
    }
  },

  // 格式化日期
  formatDate: function (date) {
    if (!date) return '';
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // 格式化金额
  formatMoney: function (amount) {
    if (amount === null || amount === undefined) return '0.00';
    return Number(amount).toFixed(2);
  }
});
