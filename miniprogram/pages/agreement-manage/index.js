// 协议签署管理页
const app = getApp();

Page({
  data: {
    signatures: [],
    loading: true,
    loadError: false,
    // 协议详情弹窗
    showDetail: false,
    detailAgreement: null,
    detailSignature: null,
  },

  onShow() {
    this.loadSignatures();
  },

  loadSignatures: async function () {
    this.setData({ loading: true, loadError: false });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('agreement_signatures')
        .orderBy('signTime', 'desc')
        .get();

      const signatures = res.data.map(s => ({
        ...s,
        signTimeText: app.formatDate(s.signTime),
      }));

      this.setData({ signatures, loading: false });
    } catch (err) {
      console.error('加载协议列表失败:', err);
      this.setData({ loading: false, loadError: true });
    }
  },

  // 查看协议详情
  goDetail(e) {
    const { id } = e.currentTarget.dataset;
    const sig = this.data.signatures.find(s => s._id === id);
    if (!sig) return;

    this.setData({ detailSignature: sig });

    // 加载协议内容
    this.loadAgreementContent(sig);
  },

  // 加载协议文本
  async loadAgreementContent(sig) {
    const db = wx.cloud.database();
    // 尝试从 agreements 集合加载
    try {
      const res = await db.collection('agreements')
        .where({ isActive: true })
        .orderBy('createTime', 'desc')
        .limit(1)
        .get();
      if (res.data.length > 0) {
        this.setData({ detailAgreement: res.data[0], showDetail: true });
        return;
      }
    } catch (e) { /* ignore */ }

    // 默认协议
    this.setData({
      detailAgreement: {
        title: sig.agreementTitle || '劳务合作协议',
        version: sig.agreementVersion || 'v1.0.0',
        content: '<p>甲方（发布企业）与乙方（任务执行人）就任务领取与执行事项，经协商一致，签订本协议。</p><p>一、任务说明：乙方通过本平台领取甲方发布的任务，按任务要求完成并交付。</p><p>三、保密条款：乙方应对任务过程中的信息保密。</p><p>四、协议有效期：自签署之日起生效。</p>',
      },
      showDetail: true,
    });
  },

  // 关闭详情
  closeDetail() {
    this.setData({ showDetail: false, detailAgreement: null, detailSignature: null });
  },

  // 重新签署
  reSign() {
    wx.navigateTo({ url: '/pages/sign-agreement/index' });
  },
});
