const app = getApp();

Page({
  data: {
    phone: '',
    code: '',
    phoneError: '',
    codeError: '',
    phoneValid: false,
    codeValid: false,
    smsSending: false,
    smsCountdown: 0,
    logging: false,
    agreed: false,
  },

  _countdownTimer: null,

  onLoad() {
    if (app.globalData.isLoggedIn) {
      wx.switchTab({ url: '/pages/home/index' });
    }
  },

  onUnload() {
    this._clearCountdown();
  },

  // ========== 手机号输入（修复：不再设置 phoneFocus:false 导致失焦） ==========
  onPhoneInput(e) {
    const raw = e.detail.value;
    const phone = raw.replace(/\D/g, '').slice(0, 11);
    const phoneValid = /^1[3-9]\d{9}$/.test(phone);
    this.setData({
      phone,
      phoneError: '',
      phoneValid,
    });
  },

  onPhoneBlur() {
    const { phone } = this.data;
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      this.setData({ phoneError: '请输入正确的手机号' });
    }
  },

  // ========== 验证码输入 ==========
  onCodeInput(e) {
    const raw = e.detail.value;
    const code = raw.replace(/\D/g, '').slice(0, 6);
    this.setData({
      code,
      codeError: '',
      codeValid: code.length >= 4,
    });
  },

  onCodeBlur() {
    const { code } = this.data;
    if (code && code.length < 4) {
      this.setData({ codeError: '验证码为4-6位数字' });
    }
  },

  // ========== 发送验证码 ==========
  async onSendSMS() {
    const { phone } = this.data;
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.setData({ phoneError: '请输入正确的手机号' });
      return;
    }
    this.setData({ smsSending: true, phoneError: '' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'userFunctions',
        data: { action: 'sendSMS', phone },
      });

      if (res.result.success) {
        wx.showToast({ title: '验证码已发送', icon: 'success' });
        this._startCountdown(60);
      } else {
        wx.showToast({ title: res.result.message || '发送失败', icon: 'none' });
      }
    } catch (err) {
      console.error('发送验证码失败:', err);
      wx.showToast({ title: '发送失败，请稍后再试', icon: 'none' });
    }
    this.setData({ smsSending: false });
  },

  // 倒计时
  _startCountdown(seconds) {
    this._clearCountdown();
    this.setData({ smsCountdown: seconds });
    this._countdownTimer = setInterval(() => {
      const next = this.data.smsCountdown - 1;
      if (next <= 0) {
        this._clearCountdown();
      } else {
        this.setData({ smsCountdown: next });
      }
    }, 1000);
  },

  _clearCountdown() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
    this.setData({ smsCountdown: 0 });
  },

  // ========== 协议勾选 ==========
  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed });
  },

  // ========== 登录 ==========
  async onLogin() {
    const { phone, code, agreed } = this.data;
    if (!agreed) {
      wx.showToast({ title: '请先同意协议', icon: 'none' });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.setData({ phoneError: '请输入正确的手机号' });
      return;
    }
    if (!code || code.length < 4) {
      this.setData({ codeError: '请输入验证码' });
      return;
    }

    this.setData({ logging: true });

    // 演示账号：本地验证码检查
    if (phone === '18518472618' && code !== '123456') {
      this.setData({ codeError: '验证码错误', logging: false });
      return;
    }

    try {
      // 演示账号直接登录，不走云函数
      if (phone === '18518472618' && code === '123456') {
        app.globalData.isLoggedIn = true;
        app.globalData.phone = phone;
        wx.setStorageSync('loginPhone', phone);
        // 异步拉取用户信息
        app.checkAuthStatus().catch(() => {});
        wx.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/home/index' });
        }, 800);
        this.setData({ logging: false });
        return;
      }

      // 其他手机号走云函数短信验证
      const res = await wx.cloud.callFunction({
        name: 'userFunctions',
        data: { action: 'phoneLogin', phone, code },
      });

      if (res.result.success) {
        const { userInfo } = res.result;
        app.globalData.isLoggedIn = true;
        app.globalData.userInfo = userInfo;
        app.globalData.phone = phone;
        wx.setStorageSync('loginPhone', phone);

        wx.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/home/index' });
        }, 800);
      } else {
        this.setData({ codeError: res.result.message || '验证码错误' });
      }
    } catch (err) {
      console.error('登录失败:', err);
      wx.showToast({ title: '登录失败，请稍后再试', icon: 'none' });
    }
    this.setData({ logging: false });
  },

  // ========== 查看协议 ==========
  viewAgreement() {
    wx.navigateTo({ url: '/pages/agreement-manage/index' });
  },

  viewPrivacy() {
    wx.navigateTo({ url: '/pages/agreement-manage/index' });
  },
});
