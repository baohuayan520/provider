// components/status-badge/index.js
Component({
  properties: {
    status: {
      type: Number,
      value: 0,
    },
  },

  data: {
    statusMap: {
      0: { text: '审核中', cls: 'badge-auditing' },
      1: { text: '进行中', cls: 'badge-progress' },
      2: { text: '已完成', cls: 'badge-done' },
      3: { text: '已结算', cls: 'badge-settled' },
      4: { text: '审核拒绝', cls: 'badge-rejected' },
    },
  },
});
