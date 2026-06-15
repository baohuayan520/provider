// 帮助文章详情页
Page({
  data: {
    article: null,
    loading: true,
    relatedArticles: [],
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.loadArticle(id);
    }
  },

  loadArticle: async function (id) {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('help_articles').doc(id).get();

      if (res.data) {
        this.setData({ article: res.data, loading: false });

        // 增加阅读量
        db.collection('help_articles').doc(id).update({
          data: { viewCount: db.command.inc(1) },
        }).catch(() => {});

        // 加载相关文章
        this.loadRelated(res.data);
      }
    } catch (err) {
      console.error('加载文章失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  loadRelated: async function (article) {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('help_articles')
        .where({
          category: article.category,
          _id: db.command.neq(article._id),
        })
        .limit(3)
        .get();

      this.setData({ relatedArticles: res.data });
    } catch (err) {
      // 忽略
    }
  },

  goDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.redirectTo({ url: `/pages/help-detail/index?id=${id}` });
  },
});
