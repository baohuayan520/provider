// 四要素认证页 — 领取流程第1步(1/3)
const app = getApp();

Page({
  data: {
    taskId: '',
    claimId: '',
    reSubmit: false,
    enterpriseName: '',
    step: 1,
    stepTotal: 3,
    submitting: false,
    alreadyVerified: false,

    // 表单数据
    form: {
      name: '',
      idCard: '',
      bankCard: '',
      phone: '',
      skills: [],
    },
    errors: {},

    // 工作技能选项
    skillOptions: [
      '数据录入', '文字校对', '图片标注', '视频审核',
      '语音转写', '翻译校对', '信息核验', '内容审核',
      '问卷调查', '文档整理', '数据清洗', '标注分类',
    ],

    // 身份证照片
    idCardFrontUrl: '',
    idCardBackUrl: '',
    uploadingFront: false,
    uploadingBack: false,
  },

  onLoad(options) {
    const { taskId, claimId, reSubmit, enterpriseName } = options;
    this.setData({ taskId, claimId, reSubmit: reSubmit === '1', enterpriseName: enterpriseName || '' });

    // 如果已认证（该企业的），直接跳过
    app.checkAuthStatus().then(() => {
      if (app.globalData.identityVerified && !this.data.reSubmit) {
        this.setData({ alreadyVerified: true });
        this.goNext();
        return;
      }
    });

    // 从用户信息回填表单 + 加载草稿
    this.preFillFromUser();
    this.loadDraft();
  },

  // 从用户已有信息回填表单
  async preFillFromUser() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('users').limit(1).get();
      if (res.data.length > 0) {
        const u = res.data[0];
        const draft = wx.getStorageSync('identity_draft');
        // 草稿优先，无草稿时回填用户信息
        if (!draft) {
          this.setData({
            form: {
              ...this.data.form,
              name: u.name || '',
              idCard: u.idCard || '',
              bankCard: u.bankCard || '',
              phone: u.phone || '',
              skills: u.skills || [],
            },
            idCardFrontUrl: u.idCardFrontUrl || '',
            idCardBackUrl: u.idCardBackUrl || '',
          });
        }
      }
    } catch (e) { /* ignore */ }
  },

  // 加载草稿
  loadDraft() {
    try {
      const draft = wx.getStorageSync('identity_draft');
      if (draft) {
        this.setData({
          form: draft.form || this.data.form,
          idCardFrontUrl: draft.idCardFrontUrl || '',
          idCardBackUrl: draft.idCardBackUrl || '',
        });
      }
    } catch (e) { /* ignore */ }
  },

  // 保存草稿
  saveDraft() {
    wx.setStorageSync('identity_draft', {
      form: this.data.form,
      idCardFrontUrl: this.data.idCardFrontUrl,
      idCardBackUrl: this.data.idCardBackUrl,
    });
  },

  // 输入处理
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({ [`form.${field}`]: value, [`errors.${field}`]: '' });
    this.saveDraft();
  },

  // 切换工作技能
  toggleSkill(e) {
    const { skill } = e.currentTarget.dataset;
    let skills = [...this.data.form.skills];
    const idx = skills.indexOf(skill);
    if (idx > -1) {
      skills.splice(idx, 1);
    } else {
      skills.push(skill);
    }
    this.setData({ 'form.skills': skills });
    this.saveDraft();
  },

  // 校验单个字段（支持事件调用和参数调用）
  validateField(e) {
    const field = typeof e === 'string' ? e : e.currentTarget.dataset.field;
    const { form } = this.data;
    let error = '';
    switch (field) {
      case 'name':
        if (!form.name.trim()) error = '请输入真实姓名';
        else if (form.name.length < 2) error = '姓名不能少于2个字';
        break;
      case 'idCard':
        if (!form.idCard) error = '请输入身份证号';
        else if (!/^\d{17}[\dXx]$/.test(form.idCard)) error = '请输入18位有效身份证号';
        break;
      case 'bankCard':
        if (!form.bankCard) error = '请输入银行卡号';
        else if (!/^\d{16,19}$/.test(form.bankCard)) error = '请输入有效银行卡号(16-19位)';
        break;
      case 'phone':
        if (!form.phone) error = '请输入手机号';
        else if (!/^1\d{10}$/.test(form.phone)) error = '请输入有效手机号';
        break;
    }
    this.setData({ [`errors.${field}`]: error });
    return !error;
  },

  // 处理身份证照片点击（预览或上传）
  handleIdcardClick(e) {
    const { field } = e.currentTarget.dataset;
    const url = this.data[field];
    if (url) {
      wx.previewImage({ urls: [url] });
    } else if (field === 'idCardFrontUrl') {
      this.uploadFront();
    } else if (field === 'idCardBackUrl') {
      this.uploadBack();
    }
  },

  // 上传身份证正面
  uploadFront() {
    this.uploadImage('idCardFrontUrl', 'uploadingFront');
  },

  // 上传身份证反面
  uploadBack() {
    this.uploadImage('idCardBackUrl', 'uploadingBack');
  },

  uploadImage(field, loadingField) {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: async (res) => {
        this.setData({ [loadingField]: true });
        try {
          const cloudRes = await wx.cloud.uploadFile({
            cloudPath: `idcard/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
            filePath: res.tempFilePaths[0],
          });
          this.setData({ [field]: cloudRes.fileID });
          this.saveDraft();
        } catch (err) {
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
        this.setData({ [loadingField]: false });
      },
    });
  },

  // 预览图片
  previewImage(e) {
    const { field } = e.currentTarget.dataset;
    const url = this.data[field];
    if (url) {
      wx.previewImage({ urls: [url] });
    }
  },

  // 删除图片
  removeImage(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: '' });
    this.saveDraft();
  },

  // 提交认证
  async submitIdentity() {
    // 全字段校验
    const fields = ['name', 'idCard', 'bankCard', 'phone'];
    let allValid = true;
    for (const f of fields) {
      if (!this.validateField(f)) allValid = false;
    }

    // 校验照片
    if (!this.data.idCardFrontUrl) {
      wx.showToast({ title: '请上传身份证正面照', icon: 'none' });
      return;
    }
    if (!this.data.idCardBackUrl) {
      wx.showToast({ title: '请上传身份证反面照', icon: 'none' });
      return;
    }

    if (!allValid) {
      wx.showToast({ title: '请检查填写信息', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      // 调用云函数进行四要素认证
      const res = await wx.cloud.callFunction({
        name: 'userFunctions',
        data: {
          action: 'verifyIdentity',
          ...this.data.form,
          skills: this.data.form.skills,
          idCardFrontUrl: this.data.idCardFrontUrl,
          idCardBackUrl: this.data.idCardBackUrl,
        },
      });

      if (res.result && res.result.success) {
        const db = wx.cloud.database();

        // 保存认证记录
        await db.collection('identity_records').add({
          data: {
            name: this.data.form.name,
            idCard: this.data.form.idCard,
            bankCard: this.data.form.bankCard,
            phone: this.data.form.phone,
            skills: this.data.form.skills,
            enterpriseName: this.data.enterpriseName,
            idCardFrontUrl: this.data.idCardFrontUrl,
            idCardBackUrl: this.data.idCardBackUrl,
            verifyResult: true,
            verifyMessage: '认证通过',
            createTime: new Date(),
          },
        });

        // 同步更新用户信息到 users 集合（用于回填）
        const userRes = await db.collection('users').limit(1).get();
        if (userRes.data.length > 0) {
          await db.collection('users').doc(userRes.data[0]._id).update({
            data: {
              name: this.data.form.name,
              idCard: this.data.form.idCard,
              bankCard: this.data.form.bankCard,
              phone: this.data.form.phone,
              skills: this.data.form.skills,
              idCardFrontUrl: this.data.idCardFrontUrl,
              idCardBackUrl: this.data.idCardBackUrl,
              identityVerified: true,
              identityTime: new Date(),
              updateTime: new Date(),
            },
          });
        } else {
          // 首次创建用户记录
          await db.collection('users').add({
            data: {
              name: this.data.form.name,
              idCard: this.data.form.idCard,
              bankCard: this.data.form.bankCard,
              phone: this.data.form.phone,
              skills: this.data.form.skills,
              idCardFrontUrl: this.data.idCardFrontUrl,
              idCardBackUrl: this.data.idCardBackUrl,
              identityVerified: true,
              identityTime: new Date(),
              createTime: new Date(),
              updateTime: new Date(),
            },
          });
        }

        // 清除草稿
        wx.removeStorageSync('identity_draft');

        // 更新全局状态
        app.globalData.identityVerified = true;

        wx.showToast({ title: '认证通过', icon: 'success' });
        setTimeout(() => this.goNext(), 1000);
      } else {
        wx.showToast({
          title: res.result?.message || '认证失败，请重试',
          icon: 'none',
          duration: 2500,
        });
      }
    } catch (err) {
      wx.showToast({ title: '网络错误，请重试', icon: 'none' });
    }

    this.setData({ submitting: false });
  },

  // 进入下一步
  goNext() {
    wx.redirectTo({
      url: `/pages/liveness/index?taskId=${this.data.taskId}&enterpriseName=${this.data.enterpriseName}`,
    });
  },
});
