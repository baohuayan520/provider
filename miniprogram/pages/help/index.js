// 帮助中心 - 钢琴键FAQ
const FAQ_DATA = {
  auth: {
    key: 'auth',
    label: '注册认证',
    icon: '🛡️',
    list: [
      {
        q: '上传身份证照片后信息没有自动带出来，怎么处理？',
        a: '您好，上传身份证照片后，有效信息无需您手工录入，系统OCR自动识别带入。如未显示，您可退出并重新登录，再次上传身份证照片尝试。',
      },
      {
        q: '身份证照片上传后提示识别异常是什么原因？',
        a: '您好，身份证图像不够清晰，比如有污渍、破损或者反光等问题，都可能导致识别异常。身份证图像的背景如果存在干扰信息，也可能会干扰识别过程。',
      },
      {
        q: '银行卡绑不上/银行卡异常怎么办？',
        a: '您好，请您确认填写的银行卡是否在本人名下办理，且为储蓄卡，并核实银行卡号码是否准确无误。确认无误后请核实下您的银行卡状态是否正常（可以拨打所属银行客服电话，咨询银行卡状态）。',
      },
      {
        q: '实名认证时，提示"手机号验证不一致"？',
        a: '您好，需要您使用本人实名或银行卡预留的手机号完成验证。',
      },
      {
        q: '我为什么要签约？',
        a: '您好，平台为灵活就业群体提供身份核验、任务匹配、收入结算、税款代缴等服务。在为您提供灵活就业服务前，需要与您签订《服务协议》，确保您在获得上述服务时的合法权益得到保障。',
      },
    ],
  },
  pay: {
    key: 'pay',
    label: '签约收款',
    icon: '💰',
    list: [
      {
        q: '如何查看收款记录？',
        a: '您好，首页页脚点击"我的"展示了您的总收入，点击"结算记录"查看具体收入情况。',
      },
      {
        q: '小程序中显示的款项如何提现？',
        a: '您好，小程序上显示的款项是您在平台下的收款情况，您可以随时查看了解详情。对应款项前序已直接结算至您的银行卡或支付宝中，无需再次操作提现。',
      },
    ],
  },
  policy: {
    key: 'policy',
    label: '政策问题',
    icon: '📋',
    list: [
      {
        q: '连续劳务方案下，个人所得税如何结算申报？',
        a: '根据《互联网平台企业涉税信息报送规定》（国务院令第810号）和国家税务总局2025年第15、16号公告及其解读文件的政策要求，互联网平台内从业人员取得连续劳务报酬所得，每月收入扣除20%累计费用、扣除5000元减除费用后，按照3%-8%七级累进预率计算，由平台预扣预缴个税。次年，需您自行办理汇算清缴。',
      },
      {
        q: '连续劳务方案下，是否需要汇算清缴？',
        a: '您需要参与汇算清缴。劳务报酬所得属于综合所得，需要在取得收入的次年3月1日至6月30日期间，在个人所得税App和其他综合所得合并进行汇算清缴。在个人所得税App首页进入汇算清缴专题页后，根据提示操作办理。',
      },
      {
        q: '身边云扣缴申报后，个税申报记录什么时候体现在个税App上？',
        a: '当月劳务报酬所得会在下月申报期内进行个税申报。一般来说，申报期结束后（15日后，如遇节假日会有顺延）就会体现在个税App上。',
      },
    ],
  },
};

// 钢琴键交替色板
const PIANO_COLORS = [
  { bg: '#FFFFFF', accent: '#4A6CF7', index: 0 },
  { bg: '#F0F4FF', accent: '#4A6CF7', index: 1 },
  { bg: '#FFFFFF', accent: '#7C5CFC', index: 2 },
  { bg: '#F0F4FF', accent: '#7C5CFC', index: 3 },
  { bg: '#FFFFFF', accent: '#4A6CF7', index: 4 },
];

Page({
  data: {
    currentTab: 'auth',
    tabs: [
      { key: 'auth', label: '注册认证', icon: '🛡️' },
      { key: 'pay', label: '签约收款', icon: '💰' },
      { key: 'policy', label: '政策问题', icon: '📋' },
    ],
    faqList: [],
    expandedIndex: -1,
  },

  onLoad() {
    this.loadList('auth');
  },

  // 切换分类Tab
  switchTab(e) {
    const { tab } = e.currentTarget.dataset;
    if (tab === this.data.currentTab) return;
    this.setData({ currentTab: tab, expandedIndex: -1 });
    this.loadList(tab);
  },

  // 加载当前分类FAQ列表（附加钢琴键配色索引）
  loadList(tabKey) {
    const category = FAQ_DATA[tabKey];
    if (!category) return;
    const list = category.list.map((item, i) => ({
      ...item,
      colorIdx: i % PIANO_COLORS.length,
    }));
    this.setData({ faqList: list });
  },

  // 切换展开/收起
  toggleExpand(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({
      expandedIndex: this.data.expandedIndex === index ? -1 : index,
    });
  },
});
