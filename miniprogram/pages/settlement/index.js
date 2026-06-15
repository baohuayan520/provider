// 结算记录页 - 年月筛选 + 详情弹窗
const app = getApp();

// 模拟交易数据（含完整字段）
const MOCK_DATA = [
  {
    _id: 's1',
    taskTitle: '电商图片数据标注',
    reward: 350.00,
    status: 1, // 1=已结算
    orderNo: 'ST202606081030001',        // 订单号
    transactionNo: 'TXN202606081030001',  // 交易单号
    bankCard: '6222****1234',             // 结算银行卡
    serviceProviderName: '身边云信息科技有限公司', // 服务商名称
    enterpriseName: '腾讯云计算有限公司',     // 企业名称
    claimOrderNo: 'CLM202606050001',       // 任务领取单号
    createTime: '2026-06-05T09:20:00',    // 创建时间
    settleTime: '2026-06-08T10:30:00',    // 交易时间
    completionTime: '2026-06-07T18:00:00',// 完成时间
    settleMonth: '2026-06',
  },
  {
    _id: 's2',
    taskTitle: '短视频内容审核',
    reward: 520.00,
    status: 1,
    orderNo: 'ST202606151420001',
    transactionNo: 'TXN202606151420001',
    bankCard: '6222****5678',
    serviceProviderName: '身边云信息科技有限公司',
    enterpriseName: '字节跳动科技有限公司',
    claimOrderNo: 'CLM202606120002',
    createTime: '2026-06-12T11:00:00',
    settleTime: '2026-06-15T14:20:00',
    completionTime: '2026-06-14T20:00:00',
    settleMonth: '2026-06',
  },
  {
    _id: 's3',
    taskTitle: 'AI图像标注分类',
    reward: 430.00,
    status: 1,
    orderNo: 'ST202604220915001',
    transactionNo: 'TXN202604220915001',
    bankCard: '6217****9012',
    serviceProviderName: '云账户技术有限公司',
    enterpriseName: '阿里巴巴集团控股有限公司',
    claimOrderNo: 'CLM202604180003',
    createTime: '2026-04-18T14:30:00',
    settleTime: '2026-04-22T09:15:00',
    completionTime: '2026-04-21T16:00:00',
    settleMonth: '2026-04',
  },
  {
    _id: 's4',
    taskTitle: '企业文档整理归档',
    reward: 280.00,
    status: 1,
    orderNo: 'ST202603101600001',
    transactionNo: 'TXN202603101600001',
    bankCard: '6214****3456',
    serviceProviderName: '身边云信息科技有限公司',
    enterpriseName: '华为技术有限公司',
    claimOrderNo: 'CLM202603050004',
    createTime: '2026-03-05T08:45:00',
    settleTime: '2026-03-10T16:00:00',
    completionTime: '2026-03-09T12:00:00',
    settleMonth: '2026-03',
  },
  {
    _id: 's5',
    taskTitle: '市场问卷调查录入',
    reward: 180.00,
    status: 1,
    orderNo: 'ST202603251145001',
    transactionNo: 'TXN202603251145001',
    bankCard: '6214****7890',
    serviceProviderName: '云账户技术有限公司',
    enterpriseName: '美团点评网络技术有限公司',
    claimOrderNo: 'CLM202603220005',
    createTime: '2026-03-22T10:00:00',
    settleTime: '2026-03-25T11:45:00',
    completionTime: '2026-03-24T15:30:00',
    settleMonth: '2026-03',
  },
];

// 所有有数据的月份
const ALL_MONTHS = ['2026-03', '2026-04', '2026-06'];
// 可选的年份
const ALL_YEARS = ['2023', '2024', '2025', '2026'];

// 格式化时间为 YYYY-MM-DD HH:mm
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${M}-${day} ${h}:${m}`;
}

Page({
  data: {
    // 年月筛选
    selectedYear: '2026',
    selectedMonth: '06',
    yearList: ALL_YEARS,
    monthList: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
    allMonths: ALL_MONTHS,
    yearIndex: 3,  // 默认2026
    monthIndex: 5, // 默认06

    // 汇总
    totalIncome: 0,

    // 列表
    settlements: [],
    loading: true,
    loadError: false,

    // 详情弹窗
    showDetail: false,
    detailRecord: null,
  },

  onLoad() {
    const now = new Date();
    const y = String(now.getFullYear());
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const yi = ALL_YEARS.indexOf(y);
    this.setData({
      selectedYear: yi >= 0 ? y : '2026',
      selectedMonth: m,
      yearIndex: yi >= 0 ? yi : 3,
      monthIndex: now.getMonth(),
    });
    this.loadSettlements();
  },

  onShow() {
    this.loadSettlements(true);
  },

  // 年份选择
  onYearChange(e) {
    const idx = parseInt(e.detail.value);
    const year = ALL_YEARS[idx];
    this.setData({ selectedYear: year, yearIndex: idx });
    this.loadSettlements(true);
  },

  // 月份选择
  onMonthChange(e) {
    const idx = parseInt(e.detail.value);
    const month = this.data.monthList[idx];
    this.setData({ selectedMonth: month, monthIndex: idx });
    this.loadSettlements(true);
  },

  // 加载结算记录
  loadSettlements: async function (silent = false) {
    if (!silent) this.setData({ loading: true, loadError: false });
    const settleMonth = `${this.data.selectedYear}-${this.data.selectedMonth}`;

    try {
      const db = wx.cloud.database();

      const res = await db.collection('settlements')
        .where({ settleMonth })
        .orderBy('settleTime', 'desc')
        .get();

      let recordList = res.data;

      // 云端无数据时使用模拟数据
      if (recordList.length === 0) {
        recordList = MOCK_DATA.filter(d => d.settleMonth === settleMonth);
      }

      // 计算总收入
      let totalIncome = 0;
      const settlements = recordList.map(s => {
        totalIncome += s.reward || 0;
        return {
          ...s,
          rewardText: app.formatMoney(s.reward),
          settleTimeText: formatDateTime(s.settleTime),
          completionTimeText: formatDateTime(s.completionTime),
          createTimeText: formatDateTime(s.createTime),
          statusText: s.status === 1 ? '已结算' : (s.status === 0 ? '待结算' : '结算失败'),
        };
      });

      this.setData({ settlements, totalIncome, loading: false, loadError: false });
    } catch (err) {
      console.error('加载结算记录失败:', err);
      // 降级：直接使用模拟数据
      const mockRecords = MOCK_DATA.filter(d => d.settleMonth === settleMonth);
      let totalIncome = 0;
      const settlements = mockRecords.map(s => {
        totalIncome += s.reward || 0;
        return {
          ...s,
          rewardText: app.formatMoney(s.reward),
          settleTimeText: formatDateTime(s.settleTime),
          completionTimeText: formatDateTime(s.completionTime),
          createTimeText: formatDateTime(s.createTime),
          statusText: s.status === 1 ? '已结算' : (s.status === 0 ? '待结算' : '结算失败'),
        };
      });
      this.setData({ settlements, totalIncome, loading: false, loadError: false });
    }
  },

  // 查看详情
  showDetail(e) {
    const { id } = e.currentTarget.dataset;
    const record = this.data.settlements.find(s => s._id === id);
    if (record) {
      this.setData({ showDetail: true, detailRecord: record });
    }
  },

  // 关闭详情
  closeDetail() {
    this.setData({ showDetail: false, detailRecord: null });
  },
});
