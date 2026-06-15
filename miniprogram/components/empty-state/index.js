// components/empty-state/index.js
Component({
  properties: {
    icon: {
      type: String,
      value: '📋',
    },
    title: {
      type: String,
      value: '暂无数据',
    },
    description: {
      type: String,
      value: '',
    },
    btnText: {
      type: String,
      value: '',
    },
    btnDisabled: {
      type: Boolean,
      value: false,
    },
  },

  methods: {
    onAction() {
      this.triggerEvent('action');
    },
  },
});
