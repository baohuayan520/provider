// 个人信息页
const app = getApp();

Page({
  data: {
    userInfo: null,
    loading: true,
    isEditing: false,
    editForm: {},
    // 工作技能选项
    skillOptions: [
      '数据录入', '文字校对', '图片标注', '视频审核',
      '语音转写', '翻译校对', '信息核验', '内容审核',
      '问卷调查', '文档整理', '数据清洗', '标注分类',
    ],
  },

  onShow() {
    this.loadUserInfo();
  },

  loadUserInfo: async function () {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('users').limit(1).get();

      if (res.data.length > 0) {
        const u = res.data[0];

        this.setData({
          userInfo: {
            ...u,
            maskedName: app.maskText(u.name, 'name'),
            maskedIdCard: app.maskText(u.idCard, 'idCard'),
            maskedBankCard: app.maskText(u.bankCard, 'bankCard'),
            maskedPhone: app.maskText(u.phone, 'phone'),
            skills: u.skills || [],
          },
          loading: false,
        });
      } else {
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('加载用户信息失败:', err);
      this.setData({ loading: false });
    }
  },

  // 切换工作技能
  toggleSkill(e) {
    const { skill } = e.currentTarget.dataset;
    let skills = [...this.data.editForm.skills];
    const idx = skills.indexOf(skill);
    if (idx > -1) {
      skills.splice(idx, 1);
    } else {
      skills.push(skill);
    }
    this.setData({ 'editForm.skills': skills });
  },

  // 开始编辑
  startEdit() {
    this.setData({
      isEditing: true,
      editForm: {
        name: this.data.userInfo.name || '',
        phone: this.data.userInfo.phone || '',
        bankCard: this.data.userInfo.bankCard || '',
        bankName: this.data.userInfo.bankName || '',
        skills: this.data.userInfo.skills || [],
      },
    });
  },

  // 取消编辑
  cancelEdit() {
    this.setData({ isEditing: false, editForm: {} });
  },

  // 输入处理
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`editForm.${field}`]: e.detail.value });
  },

  // 保存编辑
  saveEdit: async function () {
    const { editForm } = this.data;
    if (!editForm.name || !editForm.phone || !editForm.bankCard) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    try {
      const db = wx.cloud.database();
      await db.collection('users').doc(this.data.userInfo._id).update({
        data: {
          name: editForm.name,
          phone: editForm.phone,
          bankCard: editForm.bankCard,
          bankName: editForm.bankName,
          skills: editForm.skills || [],
          updateTime: new Date(),
        },
      });

      wx.showToast({ title: '保存成功', icon: 'success' });
      this.setData({ isEditing: false });
      this.loadUserInfo();
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  // 预览身份证照片
  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    if (url) {
      wx.previewImage({ urls: [url] });
    }
  },
});
