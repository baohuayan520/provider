// 单独活体认证页
const app = getApp();

Page({
  data: {
    livenessStatus: 'checking',
    remainDays: 0,
    expireDate: '',
    expireText: '',
    verifying: false,
  },

  onLoad() {
    this.checkStatus();
  },

  checkStatus() {
    app.checkAuthStatus().then(() => {
      if (!app.globalData.livenessVerified) {
        this.setData({ livenessStatus: 'needAuth' });
        return;
      }
      const remain = app.getLivenessRemainDays();
      if (remain >= 30) {
        // 认证成功，展示倒计时
        const expireDate = app.formatDate(app.globalData.livenessExpireDate);
        this.setData({ livenessStatus: 'success', remainDays: remain, expireDate });
      } else if (remain > 0) {
        this.setData({
          livenessStatus: 'expiring',
          remainDays: remain,
          expireText: `${remain}天后到期，请及时重新认证`,
        });
      } else {
        const expireDate = app.formatDate(app.globalData.livenessExpireDate);
        this.setData({
          livenessStatus: 'expired',
          expireText: `已于 ${expireDate} 过期`,
        });
      }
    });
  },

  startLiveness() {
    this.setData({ verifying: true });

    wx.showModal({
      title: '人脸核身',
      content: '即将调起腾讯人脸核身服务进行活体检测',
      confirmText: '开始验证',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          try {
            const res = await wx.cloud.callFunction({
              name: 'userFunctions',
              data: { action: 'livenessVerify' },
            });

            if (res.result && res.result.success) {
              const expireDate = new Date();
              expireDate.setDate(expireDate.getDate() + 180);
              const db = wx.cloud.database();

              await db.collection('liveness_records').add({
                data: {
                  verifyResult: true,
                  expireDate,
                  source: 'single',
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

              wx.showToast({ title: '认证成功', icon: 'success' });
              setTimeout(() => this.checkStatus(), 1000);
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
});
