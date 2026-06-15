// 算税功能页
const app = getApp();

Page({
  data: {
    inputAmount: '',
    result: null,
    showRule: false,
    history: [],
  },

  onShow() {
    // 登录守卫
    if (!app.requireLogin()) return;
    this.loadHistory();
  },

  // 从云端加载历史
  async loadHistory() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('tax_records')
        .orderBy('createTime', 'desc')
        .limit(10)
        .get();

      if (res.data.length > 0) {
        const history = res.data.map(r => ({
          _id: r._id,
          gross: r.amount.toFixed(2),
          taxAmount: r.taxAmount.toFixed(2),
          netIncome: r.actualAmount.toFixed(2),
          time: this.formatTime(r.createTime),
        }));
        this.setData({ history });
      }
    } catch (err) {
      console.error('加载算税历史失败:', err);
    }
  },

  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${m}-${day} ${h}:${min}`;
  },

  // 输入金额
  onInput(e) {
    const val = e.detail.value;
    this.setData({ inputAmount: val });
    if (val) {
      this.calcTax(Number(val));
    } else {
      this.setData({ result: null });
    }
  },

  // 计算税费
  calcTax(gross) {
    if (isNaN(gross) || gross <= 0) {
      this.setData({ result: null });
      return;
    }

    let taxableAmount, taxRate, quickDeduction, taxAmount;

    if (gross <= 800) {
      taxAmount = 0;
      taxRate = 0;
      quickDeduction = 0;
      taxableAmount = 0;
    } else if (gross <= 4000) {
      taxableAmount = gross - 800;
      taxRate = 20;
      quickDeduction = 0;
      taxAmount = taxableAmount * 0.2;
    } else {
      taxableAmount = gross * 0.8;
      if (taxableAmount <= 20000) {
        taxRate = 20;
        quickDeduction = 0;
      } else if (taxableAmount <= 50000) {
        taxRate = 30;
        quickDeduction = 2000;
      } else {
        taxRate = 40;
        quickDeduction = 7000;
      }
      taxAmount = taxableAmount * (taxRate / 100) - quickDeduction;
    }

    const netIncome = gross - taxAmount;

    this.setData({
      result: {
        gross: gross.toFixed(2),
        taxableAmount: taxableAmount.toFixed(2),
        taxRate,
        quickDeduction,
        taxAmount: taxAmount.toFixed(2),
        netIncome: netIncome.toFixed(2),
      },
    });

    // 保存历史
    const record = {
      gross: gross.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      netIncome: netIncome.toFixed(2),
      time: new Date().toLocaleString(),
    };
    const history = [record, ...this.data.history].slice(0, 10);
    this.setData({ history });
    wx.setStorageSync('tax_history', history);
  },

  // 切换税率规则
  toggleRule() {
    this.setData({ showRule: !this.data.showRule });
  },

  // 快速填入历史金额
  fillAmount(e) {
    const { gross } = e.currentTarget.dataset;
    this.setData({ inputAmount: gross });
    this.calcTax(Number(gross));
  },
});
