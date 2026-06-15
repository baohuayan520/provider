# 任务领取小程序 (Provider)

基于微信小程序 + 腾讯云 CloudBase 的任务领取平台，支持任务查看、领取、四要素收集、活体认证和协议签署。

## 项目架构

| 层级 | 技术 |
|------|------|
| 小程序前端 | 微信小程序原生语言 |
| 后端服务 | 腾讯云 CloudBase（云函数 + 文档数据库） |
| 设计风格 | 简约高级风 |

## CloudBase 环境

- **环境 ID**: `cloud1-d0g8x50g49ba70206`
- **套餐版本**: 个人版
- **区域**: 上海 (ap-shanghai)

### 云函数列表

| 函数名 | 功能 | Runtime | 状态 |
|--------|------|---------|------|
| `initFunctions` | 数据库初始化 + 种子数据创建 | Nodejs18.15 | ✅ 已部署 |
| `quickstartFunctions` | 快速入门示例 | Nodejs18.15 | ✅ 已部署 |
| `taskFunctions` | 任务管理（创建/领取/审核/结算） | Nodejs18.15 | ✅ 已部署 |
| `userFunctions` | 用户管理（登录/认证/活体/协议签署） | Nodejs18.15 | ✅ 已部署 |

### 数据库集合

共 11 个集合：tasks, agreements, help_articles, users, identity_records, liveness_records, agreement_signatures, task_claims, settlements, tax_records, sms_codes

### 快速部署云函数

```bash
# 首次部署全部云函数
tcb fn deploy --all --force

# 部署单个云函数
tcb fn deploy initFunctions --force
```

## 控制台管理入口

- [CloudBase 控制台](https://tcb.cloud.tencent.com/dev?envId=cloud1-d0g8x50g49ba70206#/overview)
- [云函数管理](https://tcb.cloud.tencent.com/dev?envId=cloud1-d0g8x50g49ba70206#/scf)
- [数据库管理](https://tcb.cloud.tencent.com/dev?envId=cloud1-d0g8x50g49ba70206#/db/doc)
- [静态托管](https://tcb.cloud.tencent.com/dev?envId=cloud1-d0g8x50g49ba70206#/static-hosting)

## 参考文档

- [云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)

