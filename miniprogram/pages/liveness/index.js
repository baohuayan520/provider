// 活体认证页 — 领取流程第2步(2/3)
// 活体认证页 — 领取流程第2步(2/3)
const app = getApp();

Page({
  data: {
    taskId: '',
    enterpriseName: '',
    step: 2,
    stepTotal: 3,
    livenessStatus: 'checking', // success / expiring / expired / failed / authenticating / needAuth
    remainDays: 0,
    expireText: '',
    verifying: false,
  },

  onLoad(options) {
    const { taskId, enterpriseName } = options;
    this.setData({ taskId, enterpriseName: enterpriseName || '' });
    this.checkStatus();
  },

  // 检测活体状态
  checkStatus() {
    app.checkAuthStatus().then(() => {
      if (!app.globalData.livenessVerified) {
        this.setData({ livenessStatus: 'needAuth' });
        return;
      }
      const remain = app.getLivenessRemainDays();
      if (remain > 30) {
        this.setData({ livenessStatus: 'success', remainDays: remain });
      } else if (remain > 0) {
        this.setData({
          livenessStatus: 'expiring',
          remainDays: remain,
          expireText: `${remain}天后到期，建议提前重新认证`,
        });
      } else {
        const expireDate = app.formatDate(app.globalData.livenessExpireDate);
        this.setData({
          livenessStatus: 'expired',
          expireText: `已于 ${expireDate} 过期，无法继续领取任务`,
        });
      }
    });
  },

  // 开始人脸认证
  startLiveness() {
    this.setData({ verifying: true });

    // 调用腾讯人脸核身
    // 实际项目中需要集成腾讯云人脸核身 SDK
    // 此处为模拟流程
    wx.showModal({
      title: '人脸核身',
      content: '即将调起腾讯人脸核身服务进行活体检测',
      confirmText: '开始验证',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          try {
            // 调用云函数进行活体认证
            const res = await wx.cloud.callFunction({
              name: 'userFunctions',
              data: { action: 'livenessVerify' },
            });

            if (res.result && res.result.success) {
              const expireDate = new Date();
              expireDate.setDate(expireDate.getDate() + 180);
              const db = wx.cloud.database();

              // 保存记录
              await db.collection('liveness_records').add({
                data: {
                  verifyResult: true,
                  expireDate,
                  enterpriseName: this.data.enterpriseName,
                  source: 'claim',
                  createTime: new Date(),
                },
              });

              // 同步更新 users
              const userRes = await db.collection('users').limit(1).get();
              if (userRes.data.length > 0) {
                await db.collection('users').doc(userRes.data[0]._id).update({
                  data: {
                    livenessVerified: true,
                    livenessExpireDate: expireDate,
                    livenessDate: new Date(),
                    updateTime: new Date(),
                  },
                });
              }

              app.globalData.livenessVerified = true;
              app.globalData.livenessExpireDate = expireDate;

              wx.showToast({ title: '活体认证通过', icon: 'success' });
              setTimeout(() => this.goNext(), 1000);
            } else {
              wx.showToast({ title: '认证失败，请重试', icon: 'none' });
            }
          } catch (err) {
            wx.showToast({ title: '网络错误，请重试', icon: 'none' });
          }
        }
      },
    });
    this.setData({ verifying: false });
  },

  // 跳过（已认证且有效）
  skipAuth() {
    this.goNext();
  },

  goNext() {
    wx.redirectTo({
      url: `/pages/sign-agreement/index?taskId=${this.data.taskId}&enterpriseName=${this.data.enterpriseName}`,
    });
  },
});
