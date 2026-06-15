// components/task-card/index.js
Component({
  properties: {
    task: {
      type: Object,
      value: {},
    },
  },

  methods: {
    onClick() {
      this.triggerEvent('click', { id: this.data.task._id });
    },
  },
});
