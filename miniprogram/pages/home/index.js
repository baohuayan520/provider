const app = getApp();

Page({
  data: {
    taskList: [],
    allTasks: [],          // 原始全量数据（用于搜索过滤）
    loading: true,
    page: 1,
    pageSize: 10,
    hasMore: true,
    loadError: false,
    refreshing: false,
    dbNotReady: false,
    initLoading: false,
    // 搜索相关
    searchKeyword: '',
    searchFocused: false,
    // 视差滚动
    scrollOffset: 0,
  },

  onLoad() {
    if (!app.requireLogin()) return;
    this.loadTasks();
  },

  onShow() {
    if (!app.requireLogin()) return;
    if (this.data.allTasks.length > 0) {
      this.loadTasks(true);
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ refreshing: true, page: 1, searchKeyword: '' });
    this.loadTasks(true);
  },

  // 上拉加载更多
  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 });
    this.loadTasks();
  },

  // 滚动视差
  onScroll(e) {
    const offset = e.detail.scrollTop || 0;
    // 节流：避免高频 setData
    if (Math.abs(offset - this._lastScrollOffset) < 8) return;
    this._lastScrollOffset = offset;
    if (offset > 600) return; // 超过一定距离不再更新
    this.setData({ scrollOffset: offset });
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value.trim();
    this.setData({ searchKeyword: keyword });
    this.filterTasks(keyword);
  },

  // 清除搜索
  onSearchClear() {
    this.setData({ searchKeyword: '', searchFocused: false });
    this.filterTasks('');
  },

  // 搜索框聚焦
  onSearchFocus() {
    this.setData({ searchFocused: true });
  },

  // 搜索框失焦
  onSearchBlur() {
    if (!this.data.searchKeyword) {
      this.setData({ searchFocused: false });
    }
  },

  // 搜索按钮点击
  onSearchConfirm() {
    this.filterTasks(this.data.searchKeyword);
  },

  // 本地过滤任务
  filterTasks(keyword) {
    const { allTasks } = this.data;
    if (!keyword) {
      this.setData({ taskList: allTasks, hasMore: false });
      return;
    }
    const kw = keyword.toLowerCase();
    const filtered = allTasks.filter(t => {
      return (t.title && t.title.toLowerCase().includes(kw)) ||
             (t.enterpriseName && t.enterpriseName.toLowerCase().includes(kw));
    });
    this.setData({ taskList: filtered, hasMore: false });
  },

  // 加载任务列表
  loadTasks: async function (silent = false) {
    if (!silent) {
      this.setData({ loading: true, loadError: false });
    }

    try {
      const db = wx.cloud.database();
      const _ = db.command;
      const now = new Date();
      // 使用 ISO 字符串比较，兼容数据库中字符串和 Date 两种日期格式
      const nowISO = now.toISOString();

      const res = await db.collection('tasks')
        .where(_.and([
          { status: 1 },
          { startDate: _.lte(nowISO) },
          { endDate: _.gte(nowISO) }
        ]))
        .orderBy('createTime', 'desc')
        .skip((this.data.page - 1) * this.data.pageSize)
        .limit(this.data.pageSize)
        .get();

      // 统计各任务已领取数 + 当前用户领取状态
      const taskIds = res.data.map(t => t._id);
      const claimCounts = {};
      const userClaimedTaskIds = new Set();
      if (taskIds.length > 0) {
        const openid = await app.getOpenid();
        const claimsRes = await db.collection('task_claims')
          .where({ taskId: _.in(taskIds) })
          .get();
        claimsRes.data.forEach(c => {
          claimCounts[c.taskId] = (claimCounts[c.taskId] || 0) + 1;
          // 判断是否是当前用户的领取记录
          if (openid && c._openid === openid) {
            userClaimedTaskIds.add(c.taskId);
          }
        });
      }

      const list = res.data.map(t => ({
        ...t,
        claimedCount: claimCounts[t._id] || (t.claimedQuota || 0),
        // 当前用户是否已领取
        claimedByUser: userClaimedTaskIds.has(t._id),
        // 公司名称脱敏 前二后三
        maskedEnterpriseName: app.maskText(t.enterpriseName || '', 'enterprise'),
        // 收费标准
        payModeText: t.payMode === 1 
          ? `收费标准 · ¥${t.unitPrice}/件` 
          : `收费标准 · ${t.commissionRate}%`,
        // 任务发布时间
        publishTime: app.formatDate(t.createTime),
      }));

      if (silent || this.data.refreshing) {
        this.setData({
          allTasks: list,
          taskList: list,
          hasMore: list.length >= this.data.pageSize,
          loading: false,
          refreshing: false,
          loadError: false,
        });
      } else {
        const merged = [...this.data.allTasks, ...list];
        this.setData({
          allTasks: merged,
          taskList: merged,
          hasMore: list.length >= this.data.pageSize,
          loading: false,
          loadError: false,
        });
      }
    } catch (err) {
      console.error('加载任务失败:', err);
      // 检测是否是集合不存在的错误
      const isNoCollection = err.errCode === -502005;
      this.setData({
        loading: false,
        refreshing: false,
        loadError: isNoCollection ? false : (silent ? this.data.loadError : true),
        dbNotReady: isNoCollection,
      });
      // 自动触发数据库初始化
      if (isNoCollection) {
        console.log('检测到数据库未初始化，自动开始初始化...');
        setTimeout(() => this.initDatabase(), 500);
      }
    }

    wx.stopPullDownRefresh();
  },

  // 初始化数据库（调用云函数创建集合+种子数据）
  async initDatabase() {
    this.setData({ initLoading: true, dbNotReady: false });
    try {
      const res = await wx.cloud.callFunction({
        name: 'initFunctions',
        data: { action: 'seedAll' },
      });
      console.log('初始化结果:', res);
      if (res.result.success) {
        wx.showToast({ title: '初始化成功', icon: 'success' });
        this.setData({ page: 1, initLoading: false });
        this.loadTasks();
      } else {
        wx.showToast({ title: res.result.message || '初始化失败', icon: 'none' });
        this.setData({ dbNotReady: true, initLoading: false });
      }
    } catch (err) {
      console.error('初始化失败:', err);
      wx.showToast({ title: '请先部署 initFunctions 云函数', icon: 'none', duration: 3000 });
      this.setData({ dbNotReady: true, initLoading: false });
    }
  },

  // 重试
  onRetry() {
    this.setData({ page: 1 });
    this.loadTasks();
  },

  // 跳转任务详情
  goDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/task-detail/index?taskId=${id}` });
  },
});
