// 云函数：initFunctions — 数据库初始化
// 功能：创建全部 10 个集合 + 插入种子数据
// 文档参考：项目根目录 /数据库设计文档.md
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 安全创建集合（已存在则跳过）
 * @param {string} name 集合名称
 * @returns {{ name: string, created: boolean, existed?: boolean }}
 */
async function safeCreateCollection(name) {
  try {
    await db.createCollection(name);
    console.log(`✅ 集合 [${name}] 创建成功`);
    return { name, created: true };
  } catch (err) {
    // errCode: -502001 表示集合已存在
    if (err.errCode === -502001) {
      console.log(`⏭️  集合 [${name}] 已存在，跳过`);
      return { name, created: false, existed: true };
    }
    throw err;
  }
}

/**
 * 检查集合是否为空（无数据）
 * @param {string} name 集合名称
 * @returns {boolean}
 */
async function isEmpty(name) {
  const res = await db.collection(name).count();
  return res.total === 0;
}

// ==================== 全部 11 个集合名称 ====================
const ALL_COLLECTIONS = [
  'users',                 // 1. 用户信息表
  'tasks',                 // 2. 任务表
  'task_claims',           // 3. 任务领取记录表
  'identity_records',      // 4. 四要素认证记录表
  'liveness_records',      // 5. 活体认证记录表
  'agreements',            // 6. 协议模板表
  'agreement_signatures',  // 7. 协议签署记录表
  'settlements',           // 8. 结算记录表
  'tax_records',           // 9. 算税记录表
  'help_articles',         // 10. 帮助文章表
  'sms_codes',             // 11. 短信验证码表（新增：手机号登录）
];

// ==================== 种子数据 ====================

/**
 * tasks 种子数据 — 15条示例任务（13条进行中 + 2条已结束）
 */
function getSeedTasks() {
  return [
    // ========== 1-5：原有任务 ==========
    {
      title: '企业年报数据录入',
      description: '根据提供的企业工商年报PDF文件，将关键财务数据录入到指定Excel模板中。需确保数据准确无误，格式规范统一。',
      deliveryStandard: '按要求完成所有数据录入，经审核无误后即为完成。如有错误需在1个工作日内修正。',
      enterpriseName: '深圳腾讯科技有限公司',
      payMode: 1, unitPrice: 50.00, commissionRate: null,
      totalQuota: 100, claimedQuota: 23, status: 1,
      startDate: new Date('2026-05-01'), endDate: new Date('2026-12-31'),
      requirements: ['年满18周岁', '完成四要素实名认证', '具备基本Excel操作能力', '每日至少完成5份年报录入'],
      requirementDescription: '需自行准备联网电脑，使用平台提供的Excel模板进行数据录入。每日至少完成5份年报（约2小时工作量），数据错误率须控制在0.1%以内。未达标将扣除当日任务报酬。',
      coverImage: null, createTime: new Date(), updateTime: new Date(),
    },
    {
      title: '短视频字幕校对',
      description: '对平台提供的短视频进行字幕校对，检查错别字、标点符号、时间轴对齐等问题，每日约50条视频。',
      deliveryStandard: '每条视频字幕错误率低于0.1%，时间轴偏差不超过0.5秒。',
      enterpriseName: '北京字节跳动科技有限公司',
      payMode: 2, unitPrice: null, commissionRate: 15,
      totalQuota: 200, claimedQuota: 87, status: 1,
      startDate: new Date('2026-06-01'), endDate: new Date('2026-11-30'),
      requirements: ['中文普通话流利', '打字速度≥60字/分钟', '每日至少完成30条校对'],
      requirementDescription: '每日至少完成30条视频校对。字幕错别字率须低于千分之一，标点错误须为零。时间轴偏差超过1秒视为不合格需返工修正。连续3天不达标将暂停配发任务。',
      coverImage: null, createTime: new Date(), updateTime: new Date(),
    },
    {
      title: '商品图片标注分类',
      description: '对电商平台商品图片进行标注分类，包括商品主图识别、属性标签标注、违规图片筛查等。',
      deliveryStandard: '标注准确率达到95%以上，每日最低完成100张图片标注。',
      enterpriseName: '杭州阿里巴巴网络技术有限公司',
      payMode: 1, unitPrice: 0.50, commissionRate: null,
      totalQuota: 500, claimedQuota: 156, status: 1,
      startDate: new Date('2026-04-15'), endDate: new Date('2026-10-15'),
      requirements: ['具备基本图片识别能力', '通过活体认证', '每日至少完成80张标注'],
      requirementDescription: '需具备基本图片辨别能力，色盲色弱者请勿领取。标注准确率低于93%将触发质量复查，连续5次复查不通过将取消任务资格。每日最低完成量80张，低于此数量当日不计酬。',
      coverImage: null, createTime: new Date(), updateTime: new Date(),
    },
    {
      title: '问卷调查数据整理',
      description: '对收集的市场调查问卷数据进行整理、清洗和汇总，形成结构化数据表格。',
      deliveryStandard: '数据整理完整，无遗漏有效问卷，汇总表格格式正确。',
      enterpriseName: '上海艾瑞市场咨询有限公司',
      payMode: 1, unitPrice: 30.00, commissionRate: null,
      totalQuota: 80, claimedQuota: 45, status: 1,
      startDate: new Date('2026-06-01'), endDate: new Date('2026-09-30'),
      requirements: ['熟练使用Excel', '细心耐心，有数据整理经验优先', '签署平台服务协议'],
      requirementDescription: '需熟练使用Excel数据透视表和VLOOKUP函数。数据整理须在领取后3个工作日内完成，逾期未提交视为放弃不计报酬。格式错误超过3处需重新整理。',
      coverImage: null, createTime: new Date(), updateTime: new Date(),
    },
    {
      title: '已结束-AI训练数据标注',
      description: '对语音片段进行文字转写和标注（此任务已结束，仅作展示）。',
      deliveryStandard: '转写准确率98%以上。',
      enterpriseName: '广州网易计算机系统有限公司',
      payMode: 1, unitPrice: 2.00, commissionRate: null,
      totalQuota: 300, claimedQuota: 300, status: 2,
      startDate: new Date('2026-03-01'), endDate: new Date('2026-05-31'),
      requirements: ['普通话标准', '打字速度≥50字/分钟'],
      requirementDescription: '本任务已结束，仅作展示参考。原要求为每日转写不低于100条语音片段，转写准确率须达98%以上。',
      coverImage: null, createTime: new Date('2026-03-01'), updateTime: new Date('2026-06-01'),
    },
    // ========== 6-15：新增任务 ==========
    {
      title: '语音转文字标注',
      description: '对采集的普通话及方言语音片段进行听写转文字，标注说话人角色、情绪和背景噪音类型。',
      deliveryStandard: '转写准确率≥97%，标注一致性≥95%，每日提交量不少于200条。',
      enterpriseName: '科大讯飞股份有限公司',
      payMode: 1, unitPrice: 1.80, commissionRate: null,
      totalQuota: 350, claimedQuota: 102, status: 1,
      startDate: new Date('2026-05-15'), endDate: new Date('2026-12-31'),
      requirements: ['能听懂多种方言者优先', '打字速度≥70字/分钟', '每日至少完成150条转写'],
      requirementDescription: '每日最低完成150条，标注一致性须≥95%。方言录音需标注方言类型和置信度。连续2天未达到最低完成量，系统将自动降低任务配额。',
      coverImage: null, createTime: new Date(), updateTime: new Date(),
    },
    {
      title: '地图POI信息核验',
      description: '根据卫星图像和街景照片，核验地图上的POI名称、地址、坐标是否正确，标记已关闭或变更的商户。',
      deliveryStandard: '核验准确率≥98%，每条POI需附核验截图，每日最低完成80条。',
      enterpriseName: '高德软件有限公司',
      payMode: 1, unitPrice: 1.20, commissionRate: null,
      totalQuota: 600, claimedQuota: 231, status: 1,
      startDate: new Date('2026-04-01'), endDate: new Date('2026-11-30'),
      requirements: ['方向感好，熟悉地图操作', '每日至少完成60条核验'],
      requirementDescription: '每条POI核验需附现场截图佐证。每日最低60条，定位精度要求GPS坐标偏差≤50米。虚假核验一经发现立即取消资格并追回已发报酬。',
      coverImage: null, createTime: new Date(), updateTime: new Date(),
    },
    {
      title: '医疗影像数据整理',
      description: '对医学影像报告进行分类归档、关键字段提取及脱敏处理，辅助医疗AI模型训练。',
      deliveryStandard: '字段提取完整率100%，脱敏处理符合HIPAA标准，日处理量≥50份。',
      enterpriseName: '平安健康互联网股份有限公司',
      payMode: 1, unitPrice: 8.00, commissionRate: null,
      totalQuota: 150, claimedQuota: 38, status: 1,
      startDate: new Date('2026-06-01'), endDate: new Date('2026-12-31'),
      requirements: ['签署保密协议', '有医疗行业经验者优先', '每日至少完成30份整理'],
      requirementDescription: '医疗数据涉及患者隐私，严禁截图、录屏或外传，违规将承担法律责任。每日最低完成30份，字段提取错误为零容忍。签署保密协议后方可查看数据。',
      coverImage: null, createTime: new Date(), updateTime: new Date(),
    },
    {
      title: '电商评论情感分析',
      description: '阅读用户商品评论，判断情感倾向（正面/负面/中性），提取关键评价要素和情感强度。',
      deliveryStandard: '情感判断准确率≥90%，要素提取完整率≥95%，日处理量≥300条。',
      enterpriseName: '上海寻梦信息技术有限公司',
      payMode: 1, unitPrice: 0.35, commissionRate: null,
      totalQuota: 800, claimedQuota: 420, status: 1,
      startDate: new Date('2026-05-01'), endDate: new Date('2026-10-31'),
      requirements: ['中文阅读理解能力强', '每日至少完成200条分析'],
      requirementDescription: '需具备较强中文阅读能力。情感误判率须≤10%，每天最低200条。情绪强度标注偏差超过2级视为不合格。连续3天不合格将暂停配发任务。',
      coverImage: null, createTime: new Date(), updateTime: new Date(),
    },
    {
      title: '文档格式转换校对',
      description: '将扫描版PDF、图片文档转换为可编辑Word/Excel格式，并校对格式错乱、文字识别错误等问题。',
      deliveryStandard: '格式还原度≥95%，文字识别错误率≤0.5%，单份文档限时2小时内完成。',
      enterpriseName: '北京金山办公软件股份有限公司',
      payMode: 1, unitPrice: 25.00, commissionRate: null,
      totalQuota: 120, claimedQuota: 67, status: 1,
      startDate: new Date('2026-06-01'), endDate: new Date('2026-09-30'),
      requirements: ['熟练使用Office套件', '有文档排版经验优先', '单份文档2小时内完成'],
      requirementDescription: '需自备Office/WPS办公软件。单份文档限时2小时内完成，超时不计酬。格式还原度须≥95%，低于90%需免费重做。文字OCR错误率超过1%需人工逐字校对。',
      coverImage: null, createTime: new Date(), updateTime: new Date(),
    },
    {
      title: '物流运单数据提取',
      description: '从物流面单图片中提取收寄件人信息、运单号、重量等关键字段，录入物流管理系统。',
      deliveryStandard: '关键字段提取准确率100%，运单号零错误，每日处理量≥200单。',
      enterpriseName: '顺丰速运有限公司',
      payMode: 1, unitPrice: 0.80, commissionRate: null,
      totalQuota: 1000, claimedQuota: 345, status: 1,
      startDate: new Date('2026-04-01'), endDate: new Date('2026-12-31'),
      requirements: ['细心认真，专注力强', '每日至少完成150单'],
      requirementDescription: '需保持高度专注，运单号字段零错误容忍。单日最低完成150单，每日至少在线4小时。运单号错误1次警告，累计3次取消任务资格。金额字段误差须在0.01元以内。',
      coverImage: null, createTime: new Date(), updateTime: new Date(),
    },
    {
      title: '金融票据信息录入',
      description: '对银行承兑汇票、支票等金融票据进行影像信息录入，包括票号、金额、日期、收付款方等核心字段。',
      deliveryStandard: '金额字段零差错，总体准确率≥99.9%，须在接单后4小时内完成录入。',
      enterpriseName: '招商银行股份有限公司',
      payMode: 2, unitPrice: null, commissionRate: 12,
      totalQuota: 60, claimedQuota: 15, status: 1,
      startDate: new Date('2026-07-01'), endDate: new Date('2026-12-31'),
      requirements: ['签署保密协议', '有金融行业背景优先', '零差错意识，金额字段绝对准确'],
      requirementDescription: '需签署专项保密协议后方可领取。金额字段绝对零差错，录入错误将承担相应经济损失。限时4小时内完成，节假日不顺延。每日最多领取1单。',
      coverImage: null, createTime: new Date(), updateTime: new Date(),
    },
    {
      title: '网络舆情数据收集',
      description: '根据指定关键词，在各内容平台收集舆情数据，按模板整理事件时间线、观点分类和传播路径。',
      deliveryStandard: '数据来源真实可追溯，时间线完整无断点，观点分类覆盖主流意见≥90%。',
      enterpriseName: '北京智者天下科技有限公司',
      payMode: 1, unitPrice: 120.00, commissionRate: null,
      totalQuota: 40, claimedQuota: 12, status: 1,
      startDate: new Date('2026-06-10'), endDate: new Date('2026-10-31'),
      requirements: ['信息检索能力强', '具备基本数据分析能力', '熟悉各大社交平台'],
      requirementDescription: '需熟悉微博、小红书、抖音等主流平台。数据来源必须真实可追溯，伪造来源立即终止合作。每份报告需在48小时内交付，超时不计酬。',
      coverImage: null, createTime: new Date(), updateTime: new Date(),
    },
    {
      title: '语音数据清洗整理',
      description: '对采集的原始语音数据进行降噪、切分、格式转换处理，并按说话人、场景进行分类归档。',
      deliveryStandard: '降噪后语音清晰度≥MOS 3.5，切分精度≤50ms误差，每日处理时长≥3小时音频。',
      enterpriseName: '百度在线网络技术（北京）有限公司',
      payMode: 1, unitPrice: 15.00, commissionRate: null,
      totalQuota: 200, claimedQuota: 89, status: 1,
      startDate: new Date('2026-05-20'), endDate: new Date('2026-11-30'),
      requirements: ['有音频处理经验者优先', '每日处理时长≥2小时'],
      requirementDescription: '需自备耳机和音频处理软件。每日处理时长≥2小时原始音频（约4-6小时工作时间）。降噪后MOS评分须≥3.5，低于3分需重新处理。',
      coverImage: null, createTime: new Date(), updateTime: new Date(),
    },
    {
      title: '已结束-门店信息采集',
      description: '线下走访指定门店，拍摄门头照、店内环境照，填写门店基本信息和经营状况调研表。',
      deliveryStandard: '照片清晰可用，调研表填写完整无遗漏，定位信息准确。',
      enterpriseName: '北京三快在线科技有限公司',
      payMode: 1, unitPrice: 45.00, commissionRate: null,
      totalQuota: 100, claimedQuota: 100, status: 2,
      startDate: new Date('2026-02-01'), endDate: new Date('2026-04-30'),
      requirements: ['需要线下走访', '自备拍照设备', '有地推经验优先'],
      requirementDescription: '本任务已结束，仅作展示参考。原要求为线下实地走访，需自备拍照设备（手机即可），定位精度50米内。',
      coverImage: null, createTime: new Date('2026-02-01'), updateTime: new Date('2026-05-01'),
    },
  ];
}

/**
 * agreements 种子数据 — 1条当前生效协议
 */
function getSeedAgreements() {
  return [
    {
      title: '任务领取服务协议',
      content: `<h2>任务领取服务协议</h2>
<p>欢迎使用本平台任务领取服务。为使用本服务，您应当阅读并遵守本协议。</p>
<h3>一、协议范围</h3>
<p>本协议是您与本平台之间关于使用任务领取服务所订立的协议。您在领取任务前应完整阅读本协议，如不同意请勿继续。</p>
<h3>二、服务内容</h3>
<p>平台为您提供任务浏览、领取、认证、交付的一站式服务。您需完成实名认证（四要素认证）及活体认证后方可领取任务。</p>
<h3>三、用户义务</h3>
<p>1. 您承诺提供真实、准确、完整的个人信息，若信息不实导致的一切后果由您自行承担。</p>
<p>2. 您承诺按时按质完成所领取的任务，不得无故放弃或拖延。</p>
<p>3. 不得将任务转包或委托他人完成，一经发现平台有权取消资格并追回已发放报酬。</p>
<p>4. 不得利用平台从事违法违规活动。</p>
<h3>四、报酬结算</h3>
<p>任务完成并经审核通过后，报酬将按约定结算周期支付至您的绑定银行卡账户。个人所得税由平台依法代扣代缴。</p>
<h3>五、免责条款</h3>
<p>因不可抗力、系统维护、第三方服务故障等原因导致的服务中断或数据丢失，平台不承担责任，但将尽力恢复服务。</p>
<h3>六、其他</h3>
<p>本协议最终解释权归平台所有。如有争议，双方应友好协商解决；协商不成的，提交平台所在地有管辖权的人民法院裁决。</p>`,
      version: 'v1.0.0',
      isActive: true,       // 当前生效版本
      effectiveDate: new Date('2026-01-01'),
      createTime: new Date(),
      updateTime: new Date(),
    },
  ];
}

/**
 * help_articles 种子数据 — 6条帮助文章（含使用指南、常见问题、政策说明）
 */
function getSeedHelpArticles() {
  return [
    {
      title: '新手入门：如何领取第一个任务',
      category: 'guide',          // 使用指南
      content: `<h2>新手入门指南</h2>
<h3>第一步：完成身份认证</h3>
<p>进入任务详情后，系统会引导您完成四要素认证（姓名+身份证+银行卡+手机号），请确保信息真实有效。</p>
<h3>第二步：完成活体认证</h3>
<p>根据提示完成人脸识别，确保光线充足、面部无遮挡。认证有效期为180天。</p>
<h3>第三步：签署服务协议</h3>
<p>仔细阅读协议内容后，在手写区域签名确认。</p>
<h3>第四步：提交审核</h3>
<p>以上三步完成后，点击"提交领取"即可。审核通过后您就可以开始做任务了！</p>`,
      sortOrder: 1,             // 排第1位
      isTop: true,              // 置顶
      viewCount: 0,
      createTime: new Date(),
      updateTime: new Date(),
    },
    {
      title: '任务交付标准说明',
      category: 'guide',
      content: `<h2>任务交付标准</h2>
<p>每个任务都有明确的交付标准，请您在领取前仔细阅读任务详情中的"交付标准"部分。</p>
<h3>常见交付要求</h3>
<ul>
<li>数据标注类：标注准确率≥95%</li>
<li>内容审核类：错误率≤0.1%</li>
<li>问卷整理类：无遗漏有效问卷</li>
</ul>
<h3>上传交付物</h3>
<p>在"任务管理"中找到进行中的任务，点击"上传交付物"按钮，选择相关截图或文件上传即可。</p>`,
      sortOrder: 2,
      isTop: false,
      viewCount: 0,
      createTime: new Date(),
      updateTime: new Date(),
    },
    {
      title: '认证失败怎么办？',
      category: 'faq',            // 常见问题
      content: `<h2>认证失败常见原因及解决方案</h2>
<h3>四要素认证失败</h3>
<ul>
<li>姓名与身份证号不匹配 → 请检查是否填写正确</li>
<li>银行卡号与身份证姓名不一致 → 请使用本人银行卡</li>
<li>手机号非本人实名 → 请使用本人实名手机号</li>
</ul>
<h3>活体认证失败</h3>
<ul>
<li>光线不足 → 请到光线充足的地方重试</li>
<li>面部有遮挡 → 请摘下口罩、墨镜等遮挡物</li>
<li>动作不规范 → 请按照屏幕提示完成指定动作</li>
</ul>
<p>如多次尝试仍失败，请联系平台客服获取帮助。</p>`,
      sortOrder: 10,
      isTop: false,
      viewCount: 0,
      createTime: new Date(),
      updateTime: new Date(),
    },
    {
      title: '如何查看我的收入？',
      category: 'faq',
      content: `<h2>收入查询指南</h2>
<h3>查看结算记录</h3>
<p>进入"我的"→"结算记录"，可查看按月份的结算明细。</p>
<h3>月度汇总</h3>
<p>页面顶部展示当月总收入、总扣税、实际到账金额。</p>
<h3>算税工具</h3>
<p>进入"我的"→"税费计算"，输入金额可预估应纳税额和税后收入。</p>
<h3>到账时间</h3>
<p>任务完成并审核通过后，一般在次月15日前完成结算。</p>`,
      sortOrder: 11,
      isTop: false,
      viewCount: 0,
      createTime: new Date(),
      updateTime: new Date(),
    },
    {
      title: '活体认证有效期及续期说明',
      category: 'faq',
      content: `<h2>活体认证有效期说明</h2>
<h3>有效期</h3>
<p>活体认证通过后有效期为<strong>180个自然日</strong>。到期前会提醒您续期。</p>
<h3>过期影响</h3>
<p>活体认证过期后，您将无法领取新任务，但不影响已领取任务的执行和结算。</p>
<h3>如何续期</h3>
<p>进入"我的"→"活体认证"，点击"立即认证"重新完成人脸识别即可，认证通过后有效期自动延长180天。</p>`,
      sortOrder: 12,
      isTop: false,
      viewCount: 0,
      createTime: new Date(),
      updateTime: new Date(),
    },
    {
      title: '个人所得税扣缴说明',
      category: 'policy',         // 政策说明
      content: `<h2>劳务报酬个人所得税政策说明</h2>
<p>根据《中华人民共和国个人所得税法》，个人取得的劳务报酬所得需缴纳个人所得税，由支付方（平台）代扣代缴。</p>
<h3>税率计算规则</h3>
<table>
<tr><th>税前收入</th><th>计算方式</th><th>税率</th></tr>
<tr><td>≤800元</td><td>免税</td><td>0%</td></tr>
<tr><td>800-4000元</td><td>(收入-800)×20%</td><td>20%</td></tr>
<tr><td>4000-25000元</td><td>收入×80%×20%</td><td>20%</td></tr>
<tr><td>25000-62500元</td><td>收入×80%×30%-2000</td><td>30%</td></tr>
<tr><td>>62500元</td><td>收入×80%×40%-7000</td><td>40%</td></tr>
</table>
<h3>注意事项</h3>
<p>本说明仅供参考，实际扣税以税务机关核定为准。年度汇算清缴时，劳务报酬并入综合所得计算。</p>`,
      sortOrder: 20,
      isTop: false,
      viewCount: 0,
      createTime: new Date(),
      updateTime: new Date(),
    },
  ];
}

// ==================== 个人数据种子（用户+领取+结算+算税+认证记录） ====================

/**
 * 根据任务计算报酬
 */
function calcReward(task, count) {
  if (task.payMode === 1) {
    return +(task.unitPrice * count).toFixed(2);       // 单价模式
  }
  // 比例模式：假设每件基础金额100元
  return +((100 * count * task.commissionRate) / 100).toFixed(2);
}

/**
 * 计算个人所得税（劳务报酬）
 */
function calcTax(amount) {
  if (amount <= 800) return 0;
  if (amount <= 4000) return +((amount - 800) * 0.2).toFixed(2);
  if (amount <= 25000) return +(amount * 0.8 * 0.2).toFixed(2);
  if (amount <= 62500) return +(amount * 0.8 * 0.3 - 2000).toFixed(2);
  return +(amount * 0.8 * 0.4 - 7000).toFixed(2);
}

/**
 * users 种子数据 — 用于"我的"页面、个人信息页展示
 */
function getSeedUsers() {
  return [
    {
      // 注意：_openid 由系统自动绑定当前调用者
      name: '张明',
      idCard: '110101199003074518',
      bankCard: '6228480012345678912',
      phone: '13800138001',
      bankName: '中国农业银行',
      idCardFrontUrl: '',
      idCardBackUrl: '',
      identityVerified: true,           // 四要素已认证
      identityTime: new Date('2026-04-15'),
      livenessVerified: true,          // 活体已认证
      livenessDate: new Date('2026-04-15'),
      livenessExpireDate: new Date('2026-10-12'), // 180天后
      agreementSigned: true,           // 协议已签署
      createTime: new Date('2026-04-10'),
      lastLoginTime: new Date(),
      updateTime: new Date(),
    },
  ];
}

/**
 * task_claims 种子数据 — 领取记录（在"任务管理"页展示）
 */
function getSeedTaskClaims(tasks) {
  const now = new Date();
  return [
    {
      // 审核中的领取（刚领取，状态=审核中）
      taskId: tasks[0]._id,
      taskTitle: tasks[0].title,
      reward: calcReward(tasks[0], 10),    // 预估完成10件
      rewardCount: 10,                      // 预估完成件数
      unitPrice: tasks[0].unitPrice,        // 单价
      payMode: tasks[0].payMode,
      status: 0,             // 审核中
      identityStatus: 1,     // 四要素已认证
      livenessStatus: 1,     // 活体已认证
      agreementStatus: 1,    // 协议已签署
      deliveryUrls: [],
      auditRemark: '',
      submitTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2小时前
      createTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      updateTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      // 进行中的任务（已通过审核，正在做）
      taskId: tasks[1]._id,
      taskTitle: tasks[1].title,
      reward: calcReward(tasks[1], 5),
      rewardCount: 5,
      unitPrice: null,
      payMode: tasks[1].payMode,
      commissionRate: tasks[1].commissionRate,
      status: 1,             // 进行中
      identityStatus: 1,
      livenessStatus: 1,
      agreementStatus: 1,
      deliveryUrls: [],
      auditRemark: '审核通过，请按时完成',
      submitTime: new Date('2026-06-05'),
      createTime: new Date('2026-06-05'),
      updateTime: new Date('2026-06-05'),
    },
    {
      // 已完成待结算（交付物已上传，审核通过）
      taskId: tasks[2]._id,
      taskTitle: tasks[2].title,
      reward: calcReward(tasks[2], 50),
      rewardCount: 50,
      unitPrice: tasks[2].unitPrice,
      payMode: tasks[2].payMode,
      status: 2,             // 已完成
      identityStatus: 1,
      livenessStatus: 1,
      agreementStatus: 1,
      deliveryUrls: ['https://example.com/delivery/sample1.zip'],
      auditRemark: '交付物审核通过，等待结算',
      submitTime: new Date('2026-05-01'),
      completeTime: new Date('2026-05-20'),
      createTime: new Date('2026-05-01'),
      updateTime: new Date('2026-05-20'),
    },
    {
      // 已结算
      taskId: tasks[3]._id,
      taskTitle: tasks[3].title,
      reward: calcReward(tasks[3], 20),
      rewardCount: 20,
      unitPrice: tasks[3].unitPrice,
      payMode: tasks[3].payMode,
      status: 3,             // 已结算
      identityStatus: 1,
      livenessStatus: 1,
      agreementStatus: 1,
      deliveryUrls: ['https://example.com/delivery/sample2.xlsx'],
      auditRemark: '已完成结算',
      submitTime: new Date('2026-04-01'),
      completeTime: new Date('2026-04-18'),
      settleTime: new Date('2026-05-15'),
      createTime: new Date('2026-04-01'),
      updateTime: new Date('2026-05-15'),
    },
    {
      // 审核不通过（被驳回）
      taskId: tasks[0]._id,
      taskTitle: tasks[0].title,
      reward: 0,
      rewardCount: 0,
      unitPrice: tasks[0].unitPrice,
      payMode: tasks[0].payMode,
      status: 4,             // 审核不通过
      identityStatus: 1,
      livenessStatus: 1,
      agreementStatus: 1,
      deliveryUrls: [],
      auditRemark: '信息填写不完整，请补充银行卡开户行信息',
      submitTime: new Date('2026-05-10'),
      createTime: new Date('2026-05-10'),
      updateTime: new Date('2026-05-11'),
    },
  ];
}

/**
 * settlements 种子数据 — 结算记录（在"结算记录"页展示）
 */
function getSeedSettlements(taskClaims, tasks) {
  return [
    {
      // 4月结算（对应 task_claims[3] 已结算那条）
      claimId: taskClaims[3]._id,
      taskId: taskClaims[3].taskId,
      taskTitle: taskClaims[3].taskTitle,
      reward: taskClaims[3].reward,          // 税前报酬
      taxAmount: calcTax(taskClaims[3].reward), // 个税
      actualAmount: +(taskClaims[3].reward - calcTax(taskClaims[3].reward)).toFixed(2), // 税后实发
      settleMonth: '2026-05',                // 5月结算
      status: 1,                              // 已到账
      settleTime: new Date('2026-05-15'),
      bankCard: '6228480012345678912',
      bankName: '中国农业银行',
      remark: '4月任务结算',
      createTime: new Date('2026-05-15'),
      updateTime: new Date('2026-05-15'),
    },
    {
      // 5月结算 — 另一笔收入
      reward: 800.00,
      taxAmount: calcTax(800.00),
      actualAmount: +(800.00 - calcTax(800.00)).toFixed(2),
      taskTitle: '企业年报数据录入（5月批次）',
      taskId: tasks[0]._id,
      settleMonth: '2026-06',
      status: 1,                              // 已到账
      settleTime: new Date('2026-06-12'),
      bankCard: '6228480012345678912',
      bankName: '中国农业银行',
      remark: '5月任务结算',
      createTime: new Date('2026-06-12'),
      updateTime: new Date('2026-06-12'),
    },
    {
      // 6月结算 — 较大金额
      reward: 2500.00,
      taxAmount: calcTax(2500.00),
      actualAmount: +(2500.00 - calcTax(2500.00)).toFixed(2),
      taskTitle: '短视频字幕校对（6月批次）',
      taskId: tasks[1]._id,
      settleMonth: '2026-06',
      status: 0,                              // 待打款
      settleTime: new Date('2026-06-10'),
      bankCard: '6228480012345678912',
      bankName: '中国农业银行',
      remark: '6月任务结算，预计3个工作日内到账',
      createTime: new Date('2026-06-10'),
      updateTime: new Date('2026-06-10'),
    },
  ];
}

/**
 * tax_records 种子数据 — 算税记录（在"税费计算"页展示）
 */
function getSeedTaxRecords() {
  const now = new Date();
  return [
    {
      amount: 3000.00,          // 输入金额
      taxAmount: calcTax(3000.00), // 应纳税额
      actualAmount: +(3000.00 - calcTax(3000.00)).toFixed(2), // 税后收入
      taxRate: 20,              // 适用税率%
      createTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7天前
    },
    {
      amount: 5000.00,
      taxAmount: calcTax(5000.00),
      actualAmount: +(5000.00 - calcTax(5000.00)).toFixed(2),
      taxRate: 20,
      createTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3天前
    },
    {
      amount: 10000.00,
      taxAmount: calcTax(10000.00),
      actualAmount: +(10000.00 - calcTax(10000.00)).toFixed(2),
      taxRate: 20,
      createTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 昨天
    },
    {
      amount: 30000.00,
      taxAmount: calcTax(30000.00),
      actualAmount: +(30000.00 - calcTax(30000.00)).toFixed(2),
      taxRate: 30,
      createTime: new Date(now),
    },
  ];
}

/**
 * identity_records 种子数据 — 四要素认证记录
 */
function getSeedIdentityRecords() {
  return [
    {
      name: '张明',
      idCard: '110101199003074518',
      bankCard: '6228480012345678912',
      phone: '13800138001',
      bankName: '中国农业银行',
      idCardFrontUrl: '',
      idCardBackUrl: '',
      verifyResult: 'pass',          // 认证通过
      verifyMessage: '实名认证通过',
      verifyTime: new Date('2026-04-15'),
      createTime: new Date('2026-04-15'),
    },
  ];
}

/**
 * liveness_records 种子数据 — 活体认证记录
 */
function getSeedLivenessRecords() {
  return [
    {
      verifyResult: 'pass',          // 活体认证通过
      verifyScore: 95.8,            // 认证分数
      expireDate: new Date('2026-10-12'), // 过期时间（180天）
      verifyTime: new Date('2026-04-15'),
      createTime: new Date('2026-04-15'),
    },
  ];
}

/**
 * agreement_signatures 种子数据 — 协议签署记录
 */
function getSeedAgreementSignatures(agreements) {
  return [
    {
      agreementId: agreements[0]._id,     // 关联协议ID
      agreementTitle: agreements[0].title,
      agreementVersion: agreements[0].version,
      signatureUrl: '',                   // 签名图片URL
      signTime: new Date('2026-04-15'),
      createTime: new Date('2026-04-15'),
    },
  ];
}

// ==================== 主函数 ====================

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();

  switch (action) {

    // ========== 获取当前用户 openid ==========
    case 'getOpenid': {
      return { success: true, openid: wxContext.OPENID };
    }

    // ========== 创建全部 10 个集合 ==========
    case 'createCollections': {
      const results = [];
      for (const name of ALL_COLLECTIONS) {
        const r = await safeCreateCollection(name);
        results.push(r);
      }
      const created = results.filter(r => r.created).length;
      const existed = results.filter(r => r.existed).length;
      return {
        success: true,
        message: `创建 ${created} 个，已存在 ${existed} 个`,
        results,
      };
    }

    // ========== 插入种子任务数据（5条） ==========
    case 'seedTasks': {
      const tasks = getSeedTasks();
      const promises = tasks.map(data => db.collection('tasks').add({ data }));
      await Promise.all(promises);
      return { success: true, message: `已插入 ${tasks.length} 条任务数据` };
    }

    // ========== 插入种子协议（1条） ==========
    case 'seedAgreements': {
      if (!(await isEmpty('agreements'))) {
        return { success: true, message: '协议已存在，跳过' };
      }
      const list = getSeedAgreements();
      const promises = list.map(data => db.collection('agreements').add({ data }));
      await Promise.all(promises);
      return { success: true, message: `已插入 ${list.length} 条协议` };
    }

    // ========== 插入种子帮助文章（6条） ==========
    case 'seedHelpArticles': {
      if (!(await isEmpty('help_articles'))) {
        return { success: true, message: '帮助文章已存在，跳过' };
      }
      const list = getSeedHelpArticles();
      const promises = list.map(data => db.collection('help_articles').add({ data }));
      await Promise.all(promises);
      return { success: true, message: `已插入 ${list.length} 条帮助文章` };
    }

    // ========== 一键初始化全部（推荐） ==========
    case 'seedAll': {
      // 第一步：创建全部 11 个集合
      const createResults = [];
      for (const name of ALL_COLLECTIONS) {
        try {
          const r = await safeCreateCollection(name);
          createResults.push(r);
        } catch (err) {
          createResults.push({ name, error: err.message });
        }
      }

      // 第二步：插入种子数据（按依赖顺序）
      const seeds = {};

      // 2.1 任务种子数据（先插，后面个人数据依赖 tasks._id）
      if (await isEmpty('tasks')) {
        const tasks = getSeedTasks();
        await Promise.all(tasks.map(d => db.collection('tasks').add({ data: d })));
        seeds.tasks = `插入 ${tasks.length} 条任务 ✓`;
      } else {
        seeds.tasks = '已有数据，跳过';
      }

      // 2.2 协议种子数据（先插，后面签署记录依赖）
      if (await isEmpty('agreements')) {
        const list = getSeedAgreements();
        await Promise.all(list.map(d => db.collection('agreements').add({ data: d })));
        seeds.agreements = `插入 ${list.length} 条协议 ✓`;
      } else {
        seeds.agreements = '已有数据，跳过';
      }

      // 2.3 帮助文章种子数据
      if (await isEmpty('help_articles')) {
        const list = getSeedHelpArticles();
        await Promise.all(list.map(d => db.collection('help_articles').add({ data: d })));
        seeds.help_articles = `插入 ${list.length} 条文章 ✓`;
      } else {
        seeds.help_articles = '已有数据，跳过';
      }

      // 2.4 用户种子数据（1条 — 当前调用者即为该用户）
      if (await isEmpty('users')) {
        const users = getSeedUsers();
        await Promise.all(users.map(d => db.collection('users').add({ data: d })));
        seeds.users = `插入 ${users.length} 条用户 ✓`;
      } else {
        seeds.users = '已有数据，跳过';
      }

      // 2.5 四要素认证记录（1条）
      if (await isEmpty('identity_records')) {
        const list = getSeedIdentityRecords();
        await Promise.all(list.map(d => db.collection('identity_records').add({ data: d })));
        seeds.identity_records = `插入 ${list.length} 条认证记录 ✓`;
      } else {
        seeds.identity_records = '已有数据，跳过';
      }

      // 2.6 活体认证记录（1条）
      if (await isEmpty('liveness_records')) {
        const list = getSeedLivenessRecords();
        await Promise.all(list.map(d => db.collection('liveness_records').add({ data: d })));
        seeds.liveness_records = `插入 ${list.length} 条活体记录 ✓`;
      } else {
        seeds.liveness_records = '已有数据，跳过';
      }

      // 2.7 协议签署记录（1条 — 依赖 agreements 已插入）
      if (await isEmpty('agreement_signatures')) {
        const agreements = await db.collection('agreements').limit(1).get();
        if (agreements.data.length > 0) {
          const list = getSeedAgreementSignatures(agreements.data);
          await Promise.all(list.map(d => db.collection('agreement_signatures').add({ data: d })));
          seeds.agreement_signatures = `插入 ${list.length} 条签署记录 ✓`;
        } else {
          seeds.agreement_signatures = '无协议数据，跳过';
        }
      } else {
        seeds.agreement_signatures = '已有数据，跳过';
      }

      // 2.8 任务领取记录（5条 — 依赖 tasks 已插入）
      if (await isEmpty('task_claims')) {
        const tasks = await db.collection('tasks').limit(5).get();
        if (tasks.data.length > 0) {
          const list = getSeedTaskClaims(tasks.data);
          await Promise.all(list.map(d => db.collection('task_claims').add({ data: d })));
          seeds.task_claims = `插入 ${list.length} 条领取记录 ✓`;
        } else {
          seeds.task_claims = '无任务数据，跳过';
        }
      } else {
        seeds.task_claims = '已有数据，跳过';
      }

      // 2.9 结算记录（3条 — 依赖 task_claims 已插入）
      if (await isEmpty('settlements')) {
        const taskClaims = await db.collection('task_claims').limit(10).get();
        const tasks = await db.collection('tasks').limit(10).get();
        if (taskClaims.data.length >= 4 && tasks.data.length > 0) {
          const list = getSeedSettlements(taskClaims.data, tasks.data);
          await Promise.all(list.map(d => db.collection('settlements').add({ data: d })));
          seeds.settlements = `插入 ${list.length} 条结算记录 ✓`;
        } else {
          seeds.settlements = `领取记录不足(${taskClaims.data.length}条)或任务不足，跳过结算`;
        }
      } else {
        seeds.settlements = '已有数据，跳过';
      }

      // 2.10 算税记录（4条）
      if (await isEmpty('tax_records')) {
        const list = getSeedTaxRecords();
        await Promise.all(list.map(d => db.collection('tax_records').add({ data: d })));
        seeds.tax_records = `插入 ${list.length} 条算税记录 ✓`;
      } else {
        seeds.tax_records = '已有数据，跳过';
      }

      const created = createResults.filter(r => r.created).length;
      const existed = createResults.filter(r => r.existed).length;
      const errors = createResults.filter(r => r.error).length;

      return {
        success: true,
        message: `数据库初始化完成：创建 ${created} 个集合，${existed} 个已存在，${errors} 个出错`,
        collections: createResults,
        seeds,
      };
    }

    default:
      return {
        success: false,
        message: '未知操作，支持: createCollections | seedTasks | seedAgreements | seedHelpArticles | seedAll',
      };
  }
};
