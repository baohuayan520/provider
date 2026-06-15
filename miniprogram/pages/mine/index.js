const app = getApp();

Page({
  data: {
    userInfo: null,
    phone: '',
    stats: { claimedCount: 0, progressCount: 0, settledCount: 0 },
    totalIncome: '0.00',
    menuList: [
      { id: 'personal', icon: '👤', title: '个人信息', url: '/pages/personal-info/index', bg: 'rgba(255,140,66,0.12)' },
      { id: 'settlement', icon: '💰', title: '结算记录', url: '/pages/settlement/index', bg: 'rgba(255,140,66,0.12)' },
      { id: 'agreement', icon: '📄', title: '协议管理', url: '/pages/agreement-manage/index', bg: 'rgba(255,140,66,0.12)' },
      { id: 'tax', icon: '🧮', title: '税费计算', url: '/pages/tax-calc/index', bg: 'rgba(255,140,66,0.12)' },
      { id: 'liveness', icon: '🧑', title: '活体认证', url: '/pages/liveness-single/index', bg: 'rgba(255,140,66,0.12)' },
      { id: 'help', icon: '📋', title: '帮助中心', url: '/pages/help/index', bg: 'rgba(255,140,66,0.12)' },
    ],
  },

  onShow() {
    // 登录守卫
    if (!app.requireLogin()) return;
    this.loadUserInfo();
    this.loadStats();
    this.loadIncome();
  },

  // 加载头像区信息
  loadHeaderInfo: function () {
    this.setData({
      phone: app.globalData.phone || '',
    });
  },

  // 加载用户信息
  loadUserInfo: async function () {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('users').limit(1).get();

      if (res.data.length > 0) {
        const u = res.data[0];
        app.globalData.userInfo = u;
        app.globalData.identityVerified = u.identityVerified;
        app.globalData.livenessVerified = u.livenessVerified;
        app.globalData.livenessExpireDate = u.livenessExpireDate;
        app.globalData.agreementSigned = u.agreementSigned;

        this.setData({
          userInfo: {
            ...u,
            maskedName: app.maskText(u.name, 'name'),
            maskedPhone: app.maskText(u.phone, 'phone'),
          },
        });
      }
    } catch (err) {
      console.error('加载用户信息失败:', err);
    }
  },

  // 加载统计
  loadStats: async function () {
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      const [totalRes, progressRes, settledRes] = await Promise.all([
        db.collection('task_claims').count(),
        db.collection('task_claims').where({ status: 1 }).count(),
        db.collection('task_claims').where({ status: 3 }).count(),
      ]);

      this.setData({
        stats: {
          claimedCount: totalRes.total,
          progressCount: progressRes.total,
          settledCount: settledRes.total,
        },
      });
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  },

  // 加载总收入
  loadIncome: async function () {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('settlements').where({ status: 1 }).get();
      const total = res.data.reduce((sum, s) => sum + (s.actualAmount || 0), 0);
      this.setData({ totalIncome: total.toFixed(2) });
    } catch (err) {
      console.error('加载收入失败:', err);
    }
  },

  // 菜单跳转
  goPage(e) {
    const { url } = e.currentTarget.dataset;
    if (!url) return;
    wx.navigateTo({ url });
  },

  // ========== 退出登录 ==========
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录',
      success: (res) => {
        if (res.confirm) {
          app.logout();
          wx.reLaunch({ url: '/pages/login/index' });
        }
      },
    });
  },
});
