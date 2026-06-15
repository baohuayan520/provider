// 签署协议页 — 领取流程第3步(3/3)
const app = getApp();

Page({
  data: {
    taskId: '',
    enterpriseName: '',
    step: 3,
    stepTotal: 3,
    agreement: null,
    loading: true,
    hasRead: false,
    submitting: false,
  },

  onLoad(options) {
    const { taskId, enterpriseName } = options;
    this.setData({ taskId, enterpriseName: enterpriseName || '' });
    this.loadAgreement();
  },

  // 加载协议内容
  loadAgreement: async function () {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('agreements')
        .where({ isActive: true })
        .orderBy('createTime', 'desc')
        .limit(1)
        .get();

      if (res.data.length > 0) {
        this.setData({ agreement: res.data[0], loading: false });
      } else {
        // 使用默认协议模板
        this.setData({
          agreement: {
            title: '劳务合作协议',
            version: 'v1.0.0',
            content: '<p>甲方（发布企业）与乙方（任务执行人）就任务领取与执行事项，经协商一致，签订本协议。</p><p>一、任务说明：乙方通过本平台领取甲方发布的任务，按任务要求完成并交付。</p><p>三、保密条款：乙方应对任务过程中的信息保密。</p><p>四、协议有效期：自签署之日起生效。</p>',
          },
          loading: false,
        });
      }
    } catch (err) {
      console.error('加载协议失败:', err);
      this.setData({ loading: false });
    }
  },

  // 阅读到底（滚动触发）
  onScrollEnd() {
    if (!this.data.hasRead) {
      this.setData({ hasRead: true });
      wx.showToast({ title: '已阅读协议全文', icon: 'none', duration: 1500 });
    }
  },

  // 手动确认已读（点击触发）
  toggleRead() {
    const next = !this.data.hasRead;
    this.setData({ hasRead: next });
    if (next) {
      wx.showToast({ title: '已确认阅读协议', icon: 'none', duration: 1500 });
    }
  },

  // 确认签署并提交（首次认证流程终点：identity → liveness → sign-agreement）
  async submitAgreement() {
    if (!this.data.hasRead) {
      wx.showToast({ title: '请阅读协议全文', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      const db = wx.cloud.database();
      const _ = db.command;
      const taskId = this.data.taskId;

      // 1. 获取任务信息（先验证任务状态）
      const taskRes = await db.collection('tasks').doc(taskId).get();
      if (!taskRes.data) {
        wx.showToast({ title: '任务不存在', icon: 'none' });
        this.setData({ submitting: false });
        return;
      }
      const task = taskRes.data;

      // 2. 防重复：检查是否已有该任务的领取记录
      const existingRes = await db.collection('task_claims').where({
        taskId: task._id,
      }).get();
      if (existingRes.data && existingRes.data.length > 0) {
        wx.showToast({ title: '报名成功', icon: 'success', duration: 2000 });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/task-manage/index' });
        }, 1500);
        return;
      }

      // 3. 检查名额
      if (task.claimedQuota >= task.totalQuota) {
        wx.showToast({ title: '名额已满', icon: 'none' });
        this.setData({ submitting: false });
        return;
      }

      // 4. 保存签署记录
      await db.collection('agreement_signatures').add({
        data: {
          agreementId: this.data.agreement._id || '',
          agreementTitle: this.data.agreement.title,
          agreementVersion: this.data.agreement.version,
          enterpriseName: this.data.enterpriseName,
          signTime: new Date(),
        },
      });

      // 5. 标记已签署
      app.globalData.agreementSigned = true;

      // 6. 创建领取记录
      await db.collection('task_claims').add({
        data: {
          taskId: task._id,
          taskTitle: task.title,
          enterpriseName: task.enterpriseName || this.data.enterpriseName,
          reward: task.payMode === 1 ? task.unitPrice : 0,
          rewardCount: 1,
          unitPrice: task.payMode === 1 ? task.unitPrice : null,
          payMode: task.payMode,
          commissionRate: task.payMode === 2 ? task.commissionRate : null,
          status: 0, // 审核中
          identityStatus: 1,
          livenessStatus: 1,
          agreementStatus: 1,
          deliveryUrls: [],
          submitTime: new Date(),
          createTime: new Date(),
          updateTime: new Date(),
        },
      });

      // 7. 原子扣减名额（若权限允许）
      try {
        await db.collection('tasks').doc(taskId).update({
          data: {
            claimedQuota: _.inc(1),
            updateTime: new Date(),
          },
        });
      } catch (quotaErr) {
        // READONLY 权限下忽略，名额由云函数/后台维护
        console.warn('更新名额失败（可能为 READONLY 权限），需后台维护:', quotaErr);
      }

      wx.showToast({ title: '提交成功，等待审核', icon: 'success', duration: 2000 });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/task-manage/index' });
      }, 1500);
    } catch (err) {
      console.error('提交失败:', err);
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
