// 云函数：userFunctions — 用户认证与管理
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// ========== 生成6位随机数字验证码 ==========
function generateCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { action } = event;

  switch (action) {
    // ========== 发送短信验证码 ==========
    case 'sendSMS': {
      const { phone } = event;

      // 校验手机号格式
      if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
        return { success: false, message: '手机号格式不正确' };
      }

      try {
        // 检查60秒内是否已发送过
        const smsCol = db.collection('sms_codes');
        const recent = await smsCol
          .where(_.and([
            { phone },
            { createTime: _.gte(new Date(Date.now() - 60 * 1000)) }
          ]))
          .orderBy('createTime', 'desc')
          .limit(1)
          .get();

        if (recent.data.length > 0) {
          return { success: false, message: '请60秒后再试' };
        }

        // 生成验证码（开发环境打印到日志，生产环境对接腾讯云 SMS）
        const code = generateCode(6);

        // TODO: 对接腾讯云短信服务发送短信
        // 示例：调用 cloud.openapi().sendSms({...})
        // 当前为开发模式，将验证码写入云函数日志
        console.log('========================================');
        console.log(`【短信验证码】手机号: ${phone}  验证码: ${code}`);
        console.log('========================================');

        // 存储验证码到数据库（5分钟有效）
        const expireTime = new Date(Date.now() + 5 * 60 * 1000);
        await smsCol.add({
          data: {
            phone,
            code,
            used: false,           // 是否已使用
            expired: false,        // 是否已过期
            expireTime,            // 过期时间
            createTime: new Date(),
          },
        });

        return { success: true, message: '验证码已发送' };
      } catch (err) {
        // 集合不存在时先创建再重试
        if (err.errCode === -502005) {
          try {
            await db.createCollection('sms_codes');
            console.log('已创建 sms_codes 集合');
            // 重试
            const code2 = generateCode(6);
            console.log(`【短信验证码-重试】手机号: ${phone}  验证码: ${code2}`);
            await db.collection('sms_codes').add({
              data: {
                phone,
                code: code2,
                used: false,
                expired: false,
                expireTime: new Date(Date.now() + 5 * 60 * 1000),
                createTime: new Date(),
              },
            });
            return { success: true, message: '验证码已发送' };
          } catch (err2) {
            console.error('创建 sms_codes 集合失败:', err2);
            return { success: false, message: '系统错误，请稍后重试' };
          }
        }
        console.error('发送验证码失败:', err);
        return { success: false, message: '发送失败，请稍后重试' };
      }
    }

    // ========== 手机号+验证码登录 ==========
    case 'phoneLogin': {
      const { phone, code } = event;

      if (!phone || !code) {
        return { success: false, message: '手机号和验证码不能为空' };
      }

      // DEBUG: 开发测试账号快捷登录，跳过验证码校验
      const isDevBypass = (phone === '18518472618' && code === '123456');

      try {
        if (!isDevBypass) {
          // 查找最新一条未使用、未过期的验证码
          const now = new Date();
          const smsRes = await db.collection('sms_codes')
            .where(_.and([
              { phone },
              { used: false },
              { expireTime: _.gte(now) }
            ]))
            .orderBy('createTime', 'desc')
            .limit(1)
            .get();

          if (smsRes.data.length === 0) {
            return { success: false, message: '验证码已过期，请重新获取' };
          }

          const record = smsRes.data[0];

          // 验证码错误次数限制（5次）
          if (record.attempts >= 5) {
            return { success: false, message: '验证码错误次数过多，请重新获取' };
          }

          // 比对验证码
          if (record.code !== String(code)) {
            // 增加错误次数
            await db.collection('sms_codes').doc(record._id).update({
              data: { attempts: _.inc(1), updateTime: new Date() },
            });
            const remain = 5 - (record.attempts + 1);
            if (remain <= 0) {
              return { success: false, message: '验证码已失效，请重新获取' };
            }
            return { success: false, message: `验证码错误，还剩${remain}次机会` };
          }

          // 标记验证码为已使用
          await db.collection('sms_codes').doc(record._id).update({
            data: { used: true, updateTime: new Date() },
          });
        }

        // 查询或创建用户
        const userRes = await db.collection('users').where({ _openid: OPENID }).get();

        let userInfo;
        if (userRes.data.length > 0) {
          // 更新用户手机号和登录时间
          const userId = userRes.data[0]._id;
          await db.collection('users').doc(userId).update({
            data: {
              phone,
              lastLoginTime: new Date(),
              updateTime: new Date(),
            },
          });
          userInfo = { ...userRes.data[0], phone, lastLoginTime: new Date() };
        } else {
          // 创建新用户
          const addRes = await db.collection('users').add({
            data: {
              _openid: OPENID,
              phone,
              identityVerified: false,
              livenessVerified: false,
              agreementSigned: false,
              createTime: new Date(),
              lastLoginTime: new Date(),
              updateTime: new Date(),
            },
          });
          userInfo = {
            _id: addRes._id,
            _openid: OPENID,
            phone,
            identityVerified: false,
            livenessVerified: false,
            agreementSigned: false,
            createTime: new Date(),
            lastLoginTime: new Date(),
          };
        }

        return { success: true, message: '登录成功', userInfo };
      } catch (err) {
        console.error('手机号登录失败:', err);
        return { success: false, message: '登录失败，请稍后重试' };
      }
    }

    // ========== 四要素认证 ==========
    case 'verifyIdentity': {
      const { name, idCard, bankCard, phone, idCardFrontUrl, idCardBackUrl } = event;

      // TODO: 对接第三方实名认证服务（如阿里云、腾讯云实名认证API）
      // 此处为模拟验证逻辑
      const basicCheck = name && idCard && bankCard && phone
        && idCard.length === 18 && phone.length === 11 && bankCard.length >= 16;

      if (!basicCheck) {
        return { success: false, message: '信息校验不通过，请检查填写内容' };
      }

      try {
        // 查询是否已有用户记录
        const userRes = await db.collection('users').where({ _openid: OPENID }).get();

        if (userRes.data.length > 0) {
          // 更新用户
          await db.collection('users').doc(userRes.data[0]._id).update({
            data: {
              name, idCard, bankCard, phone,
              idCardFrontUrl, idCardBackUrl,
              identityVerified: true,
              identityTime: new Date(),
              updateTime: new Date(),
            },
          });
        } else {
          // 创建用户
          await db.collection('users').add({
            data: {
              _openid: OPENID,
              name, idCard, bankCard, phone,
              idCardFrontUrl, idCardBackUrl,
              identityVerified: true,
              identityTime: new Date(),
              livenessVerified: false,
              agreementSigned: false,
              createTime: new Date(),
              updateTime: new Date(),
            },
          });
        }

        return { success: true, message: '认证通过' };
      } catch (err) {
        console.error('四要素认证保存失败:', err);
        return { success: false, message: '系统错误，请稍后重试' };
      }
    }

    // ========== 活体认证 ==========
    case 'livenessVerify': {
      try {
        // TODO: 对接腾讯人脸核身服务
        // 此处为模拟验证 - 实际需调用腾讯云人脸核身API获取认证结果

        // 计算过期时间（+180天）
        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + 180);

        // 更新用户活体状态
        await db.collection('users').where({ _openid: OPENID }).update({
          data: {
            livenessVerified: true,
            livenessDate: new Date(),
            livenessExpireDate: expireDate,
            updateTime: new Date(),
          },
        });

        return { success: true, expireDate };
      } catch (err) {
        console.error('活体认证失败:', err);
        return { success: false, message: '活体认证失败，请重试' };
      }
    }

    // ========== 获取用户信息 ==========
    case 'getUserInfo': {
      try {
        const res = await db.collection('users').where({ _openid: OPENID }).get();
        return { success: true, data: res.data[0] || null };
      } catch (err) {
        return { success: false, message: '获取用户信息失败' };
      }
    }

    // ========== 更新用户信息 ==========
    case 'updateUserInfo': {
      const { name, phone, bankCard, bankName } = event;
      try {
        await db.collection('users').where({ _openid: OPENID }).update({
          data: { name, phone, bankCard, bankName, updateTime: new Date() },
        });
        return { success: true, message: '更新成功' };
      } catch (err) {
        return { success: false, message: '更新失败' };
      }
    }

    default:
      return { success: false, message: '未知操作' };
  }
};
