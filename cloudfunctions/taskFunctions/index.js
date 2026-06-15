// 云函数：taskFunctions — 任务领取与管理
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { action } = event;

  switch (action) {
    // ========== 获取进行中的任务列表 ==========
    case 'getAvailableTasks': {
      const { page = 1, pageSize = 10 } = event;
      try {
        const now = new Date();
        const res = await db.collection('tasks')
          .where(_.and([
            { status: 1 },
            { startDate: _.lte(now) },
            { endDate: _.gte(now) },
          ]))
          .orderBy('createTime', 'desc')
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .get();

        return { success: true, data: res.data };
      } catch (err) {
        return { success: false, message: '获取任务失败' };
      }
    }

    // ========== 获取任务详情 ==========
    case 'getTaskDetail': {
      const { taskId } = event;
      try {
        const res = await db.collection('tasks').doc(taskId).get();
        return { success: true, data: res.data };
      } catch (err) {
        return { success: false, message: '获取任务详情失败' };
      }
    }

    // ========== 提交领取申请 ==========
    case 'submitClaim': {
      const { taskId } = event;
      try {
        // 检查任务状态
        const taskRes = await db.collection('tasks').doc(taskId).get();
        if (!taskRes.data) {
          return { success: false, message: '任务不存在' };
        }
        const task = taskRes.data;
        if (task.status !== 1) {
          return { success: false, message: '任务不在进行中' };
        }
        if (task.claimedQuota >= task.totalQuota) {
          return { success: false, message: '名额已满' };
        }

        // 检查用户认证状态
        const userRes = await db.collection('users').where({ _openid: OPENID }).get();
        if (userRes.data.length === 0) {
          return { success: false, message: '请先完成身份认证' };
        }
        const user = userRes.data[0];
        if (!user.identityVerified) {
          return { success: false, message: '请先完成四要素认证' };
        }
        if (!user.livenessVerified || new Date() > new Date(user.livenessExpireDate)) {
          return { success: false, message: '请先完成活体认证' };
        }

        // 检查是否已领取
        const claimCheck = await db.collection('task_claims').where({
          taskId,
          _openid: OPENID,
          status: _.neq(4),
        }).get();
        if (claimCheck.data.length > 0) {
          return { success: false, message: '您已领取该任务' };
        }

        // 创建领取记录
        await db.collection('task_claims').add({
          data: {
            _openid: OPENID,
            taskId,
            taskTitle: task.title,
            reward: task.payMode === 1 ? task.unitPrice : 0,
            status: 0,
            identityStatus: user.identityVerified ? 1 : 0,
            livenessStatus: user.livenessVerified ? 1 : 0,
            agreementStatus: 1,
            deliveryUrls: [],
            submitTime: new Date(),
            createTime: new Date(),
            updateTime: new Date(),
          },
        });

        // 更新名额
        await db.collection('tasks').doc(taskId).update({
          data: {
            claimedQuota: _.inc(1),
            updateTime: new Date(),
          },
        });

        return { success: true, message: '已提交，等待审核' };
      } catch (err) {
        console.error('提交领取失败:', err);
        return { success: false, message: '提交失败，请重试' };
      }
    }

    // ========== 获取领取记录 ==========
    case 'getMyClaims': {
      const { status } = event;
      try {
        let query = db.collection('task_claims').where({ _openid: OPENID });
        if (status !== undefined && status !== null) {
          query = query.where({ status: Number(status) });
        }
        const res = await query.orderBy('createTime', 'desc').get();
        return { success: true, data: res.data };
      } catch (err) {
        return { success: false, message: '获取记录失败' };
      }
    }

    // ========== 上传交付物 ==========
    case 'uploadDelivery': {
      const { claimId } = event;
      try {
        await db.collection('task_claims').doc(claimId).update({
          data: {
            status: 2,
            completeTime: new Date(),
            updateTime: new Date(),
          },
        });
        return { success: true, message: '交付成功' };
      } catch (err) {
        return { success: false, message: '操作失败' };
      }
    }

    // ========== 重新提交（审核拒绝后） ==========
    case 'reSubmitClaim': {
      const { claimId } = event;
      try {
        await db.collection('task_claims').doc(claimId).update({
          data: {
            status: 0,
            submitTime: new Date(),
            auditRemark: '',
            updateTime: new Date(),
          },
        });
        return { success: true, message: '已重新提交' };
      } catch (err) {
        return { success: false, message: '操作失败' };
      }
    }

    // ========== 获取可用协议 ==========
    case 'getActiveAgreement': {
      try {
        const res = await db.collection('agreements')
          .where({ isActive: true })
          .orderBy('createTime', 'desc')
          .limit(1)
          .get();
        return { success: true, data: res.data[0] || null };
      } catch (err) {
        return { success: false, message: '获取协议失败' };
      }
    }

    default:
      return { success: false, message: '未知操作' };
  }
};
