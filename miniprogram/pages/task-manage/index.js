const app = getApp();

Page({
  data: {
    claims: [],
    loading: true,
    loadError: false,
  },

  onLoad() {
    if (!app.requireLogin()) return;
    this.loadClaims();
  },

  onShow() {
    if (!app.requireLogin()) return;
    this.loadClaims(true);
  },

  // 加载领取记录（默认展示全部）
  loadClaims: async function (silent = false) {
    if (!silent) this.setData({ loading: true, loadError: false });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('task_claims').orderBy('createTime', 'desc').limit(50).get();

      // 收集所有 taskId，批量查询 tasks 表获取硬性条件
      const taskIds = [...new Set(res.data.map(c => c.taskId).filter(Boolean))];
      let tasksMap = {};
      if (taskIds.length > 0) {
        const taskRes = await db.collection('tasks')
          .where({ _id: db.command.in(taskIds) })
          .field({ requirements: true, requirementDescription: true })
          .get();
        tasksMap = {};
        taskRes.data.forEach(t => { tasksMap[t._id] = t; });
      }

      const claims = res.data.map(c => {
        // 预估报酬格式化：显示单价 × 次数
        let rewardDetail = '';
        if (c.payMode === 1 && c.unitPrice && c.rewardCount) {
          rewardDetail = `¥${app.formatMoney(c.unitPrice)}/件 × ${c.rewardCount}件 = ¥${app.formatMoney(c.reward)}`;
        } else if (c.payMode === 2 && c.commissionRate) {
          rewardDetail = `佣金${c.commissionRate}% = ¥${app.formatMoney(c.reward)}`;
        } else {
          rewardDetail = `¥${app.formatMoney(c.reward)}`;
        }
        // 从 tasksMap 合并硬性条件
        const taskInfo = tasksMap[c.taskId] || {};
        return {
          ...c,
          claimTimeText: app.formatDate(c.createTime),
          rewardText: app.formatMoney(c.reward),
          rewardDetail,
          requirements: taskInfo.requirements || [],
          requirementDescription: taskInfo.requirementDescription || '',
        };
      });

      this.setData({ claims, loading: false });
    } catch (err) {
      console.error('加载领取记录失败:', err);
      this.setData({ loading: false, loadError: true });
    }
  },

  // 查看详情（卡片点击）
  goDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/task-detail/index?claimId=${id}&fromManage=1` });
  },

  // 空操作（阻止卡片点击冒泡）
  noop() {},

  // 重新提交（审核拒绝）
  reSubmit(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/task-detail/index?claimId=${id}&reSubmit=1` });
  },

  // 上传交付物
  uploadDelivery(e) {
    const { id } = e.currentTarget.dataset;
    wx.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (chooseRes) => {
        wx.showLoading({ title: '上传中...' });
        try {
          const urls = [];
          for (const path of chooseRes.tempFilePaths) {
            const cloudRes = await wx.cloud.uploadFile({
              cloudPath: `delivery/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
              filePath: path,
            });
            urls.push(cloudRes.fileID);
          }

          const db = wx.cloud.database();
          await db.collection('task_claims').doc(id).update({
            data: {
              deliveryUrls: db.command.push(urls),
              status: 2,
              completeTime: new Date(),
              updateTime: new Date(),
            },
          });

          wx.hideLoading();
          wx.showToast({ title: '上传成功', icon: 'success' });
          this.loadClaims(true);
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
      },
    });
  },

  // 去任务大厅
  goHome() {
    wx.switchTab({ url: '/pages/home/index' });
  },
});
