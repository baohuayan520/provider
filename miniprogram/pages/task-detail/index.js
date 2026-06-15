// 任务详情 & 领取入口
const app = getApp();

Page({
  data: {
    taskId: '',
    claimId: '',
    reSubmit: false,
    fromManage: false,
    task: null,
    loading: true,
    claimed: false,
    claimStatus: null,
    canClaim: true,
    claimNotAllowedMsg: '',
    // 企业名称脱敏
    maskedEnterpriseName: '',
  },

  onLoad(options) {
    const { taskId, claimId, reSubmit, fromManage } = options;
    this.setData({ taskId, claimId, reSubmit: reSubmit === '1', fromManage: fromManage === '1' });
    if (taskId) {
      this.loadTaskDetail(taskId);
    } else if (claimId) {
      this.loadClaimDetail(claimId);
    }
  },

  // 企业名称脱敏：前2后3
  maskEnterprise(name) {
    if (!name || name.length <= 2) return name;
    return name.slice(0, 2) + '***' + name.slice(-3);
  },

  // 加载任务详情
  loadTaskDetail: async function (taskId) {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('tasks').doc(taskId).get();
      
      if (!res.data) {
        wx.showToast({ title: '任务不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
        return;
      }

      const task = res.data;
      const now = new Date();
      const endDate = new Date(task.endDate);

      // 判断是否在有效期内
      let canClaim = true;
      let claimNotAllowedMsg = '';
      if (now > endDate) {
        canClaim = false;
        claimNotAllowedMsg = '任务已结束';
      } else if (task.claimedQuota >= task.totalQuota) {
        canClaim = false;
        claimNotAllowedMsg = '名额已满';
      }

      // 检查是否已领取（非拒绝状态的记录）
      const claimRes = await db.collection('task_claims').where({
        taskId: taskId,
        status: db.command.neq(4),
      }).get();

      const claimed = claimRes.data.length > 0;
      const currentClaim = claimRes.data[0] || null;

      // 企业名称脱敏（审核中/进行中时脱敏）
      let maskedEnterpriseName = task.enterpriseName;
      if (currentClaim && (currentClaim.status === 0 || currentClaim.status === 1)) {
        maskedEnterpriseName = this.maskEnterprise(task.enterpriseName);
      }

      this.setData({
        task: {
          ...task,
          payModeText: task.payMode === 1
            ? `收费标准 · ¥${task.unitPrice}/件`
            : `收费标准 · ${task.commissionRate}%`,
          taskPeriod: `${app.formatDate(task.startDate)} ~ ${app.formatDate(task.endDate)}`,
          requirements: task.requirements || [],
          requirementDescription: task.requirementDescription || '',
        },
        claimed,
        canClaim,
        claimNotAllowedMsg,
        maskedEnterpriseName,
        claimStatus: currentClaim,
        loading: false,
      });
    } catch (err) {
      console.error('加载任务详情失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // 加载领取详情
  loadClaimDetail: async function (claimId) {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('task_claims').doc(claimId).get();
      if (res.data) {
        const claim = res.data;
        const taskRes = await db.collection('tasks').doc(claim.taskId).get();
        const task = taskRes.data;

        // 企业名称脱敏
        const maskedEnterpriseName = (claim.status === 0 || claim.status === 1)
          ? this.maskEnterprise(task.enterpriseName)
          : task.enterpriseName;

        this.setData({
          task: {
            ...task,
            payModeText: task.payMode === 1
              ? `收费标准 · ¥${task.unitPrice}/件`
              : `收费标准 · ${task.commissionRate}%`,
            taskPeriod: `${app.formatDate(task.startDate)} ~ ${app.formatDate(task.endDate)}`,
            requirements: task.requirements || [],
            requirementDescription: task.requirementDescription || '',
          },
          claimStatus: claim,
          claimed: true,
          maskedEnterpriseName,
          loading: false,
        });
      }
    } catch (err) {
      console.error('加载详情失败:', err);
      this.setData({ loading: false });
    }
  },

  // ========== 核心：开始领取（按「用户+企业」双重维度判断是否免认证） ==========
  async startClaim() {
    if (!this.data.canClaim || this.data.claimed) return;

    const task = this.data.task;
    const enterpriseName = task.enterpriseName;
    
    wx.showLoading({ title: '检查认证状态...' });

    try {
      const db = wx.cloud.database();
      const _ = db.command;

      // 双重过滤：当前用户 + 该企业（防止跨用户数据污染）
      // CloudBase 自动注入 _openid，此处显式传递确保查询精准
      const queryIdentity = { enterpriseName, verifyResult: true };
      const queryLiveness = { enterpriseName, verifyResult: true };
      const queryAgreement = { enterpriseName };

      // 查询该企业下的认证记录（按当前 _openid + enterpriseName 双重过滤）
      const [identityRes, livenessRes, agreementRes] = await Promise.all([
        db.collection('identity_records')
          .where(queryIdentity)
          .orderBy('createTime', 'desc').limit(1).get(),
        db.collection('liveness_records')
          .where(queryLiveness)
          .orderBy('createTime', 'desc').limit(1).get(),
        db.collection('agreement_signatures')
          .where(queryAgreement)
          .orderBy('signTime', 'desc').limit(1).get(),
      ]);

      const hasIdentity = identityRes.data.length > 0;
      const hasLiveness = livenessRes.data.length > 0 && 
        new Date(livenessRes.data[0].expireDate) > new Date();
      const hasAgreement = agreementRes.data.length > 0;

      wx.hideLoading();

      // ✅ 同客户：该企业下三项认证都完成 → 免认证，直接报名
      if (hasIdentity && hasLiveness && hasAgreement) {
        app.globalData.identityVerified = true;
        app.globalData.livenessVerified = true;
        app.globalData.agreementSigned = true;
        // 标记为免认证快速通道
        this._isQuickClaim = true;
        this.submitClaim();
        return;
      }

      // 🔄 新客户/缺少步骤 → 按顺序引导完整认证流程
      if (!hasIdentity) {
        wx.navigateTo({
          url: `/pages/identity/index?taskId=${task._id}&enterpriseName=${enterpriseName}`,
        });
      } else if (!hasLiveness) {
        app.globalData.identityVerified = true;
        wx.navigateTo({
          url: `/pages/liveness/index?taskId=${task._id}&enterpriseName=${enterpriseName}`,
        });
      } else if (!hasAgreement) {
        app.globalData.identityVerified = true;
        app.globalData.livenessVerified = true;
        wx.navigateTo({
          url: `/pages/sign-agreement/index?taskId=${task._id}&enterpriseName=${enterpriseName}`,
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('检查认证状态失败:', err);
      // 降级：走全局认证状态
      this.fallbackStartClaim();
    }
  },

  // 降级方案（兼容旧逻辑）
  fallbackStartClaim() {
    app.checkAuthStatus().then(() => {
      if (!app.globalData.identityVerified) {
        wx.navigateTo({
          url: `/pages/identity/index?taskId=${this.data.task._id}&enterpriseName=${this.data.task.enterpriseName}`,
        });
      } else if (!app.globalData.livenessVerified || app.isLivenessExpired()) {
        wx.navigateTo({
          url: `/pages/liveness/index?taskId=${this.data.task._id}&enterpriseName=${this.data.task.enterpriseName}`,
        });
      } else if (!app.globalData.agreementSigned) {
        wx.navigateTo({
          url: `/pages/sign-agreement/index?taskId=${this.data.task._id}&enterpriseName=${this.data.task.enterpriseName}`,
        });
      } else {
        this.submitClaim();
      }
    });
  },

  // 直接提交领取申请（同客户免认证快速通道 / 降级通道）
  submitClaim: async function () {
    wx.showLoading({ title: '提交中...' });
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      const task = this.data.task;
      const isQuickClaim = this._isQuickClaim;
      this._isQuickClaim = false; // 重置标记

      // 1. 防重复：检查是否已有该任务的领取记录
      const existingRes = await db.collection('task_claims').where({
        taskId: task._id,
      }).get();
      
      if (existingRes.data && existingRes.data.length > 0) {
        wx.hideLoading();
        wx.showToast({ title: '报名成功', icon: 'success', duration: 2000 });
        this.setData({ claimed: true });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/task-manage/index' });
        }, 1500);
        return;
      }

      // 2. 检查名额（读当前值，防止超卖）
      const taskRes = await db.collection('tasks').doc(task._id).get();
      if (!taskRes.data || taskRes.data.claimedQuota >= taskRes.data.totalQuota) {
        wx.hideLoading();
        wx.showToast({ title: '名额已满', icon: 'none' });
        this.setData({ canClaim: false, claimNotAllowedMsg: '名额已满' });
        return;
      }

      // 3. 创建领取记录
      await db.collection('task_claims').add({
        data: {
          taskId: task._id,
          taskTitle: task.title,
          enterpriseName: task.enterpriseName,
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

      // 4. 原子扣减名额（防止并发超卖）
      await db.collection('tasks').doc(task._id).update({
        data: {
          claimedQuota: _.inc(1),
          updateTime: new Date(),
        },
      });

      wx.hideLoading();
      // 同客户免认证 → "报名成功"；首次认证 → "提交成功，等待审核"
      const toastTitle = isQuickClaim ? '报名成功' : '已提交，等待审核';
      wx.showToast({ title: toastTitle, icon: 'success', duration: 2000 });
      this.setData({ claimed: true });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/task-manage/index' });
      }, 1500);
    } catch (err) {
      wx.hideLoading();
      console.error('提交领取失败:', err);
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    }
  },

  // 重新提交（审核拒绝后）
  reSubmitClaim() {
    const task = this.data.task;
    wx.navigateTo({
      url: `/pages/identity/index?taskId=${task._id}&reSubmit=1&claimId=${this.data.claimId}&enterpriseName=${task.enterpriseName}`,
    });
  },

  // 查看进度
  goManage() {
    wx.switchTab({ url: '/pages/task-manage/index' });
  },
});
