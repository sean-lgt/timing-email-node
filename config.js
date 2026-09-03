require('dotenv').config()

// 配置相关信息（敏感项优先从环境变量读取）
exports.config = {
  CITY: process.env.CITY || '深圳', //获取城市天气
  TOGETHER_TIME: process.env.TOGETHER_TIME || '2000-01-01', //在一起的时间
  EMAIL_NAME: process.env.EMAIL_NAME || '陪你一起看世界系列', //邮箱名称
  EMALI_SERVICE: process.env.EMAIL_SERVICE || process.env.EMALI_SERVICE || '163', //使用163服务 https://nodemailer.com/smtp/well-known/
  EMAIL_ACCOUNT: process.env.SMTP_USER || process.env.EMAIL_ACCOUNT || '', //使用发送邮箱的账号
  EMAIL_PASS: process.env.SMTP_PASS || process.env.EMAIL_PASS || '', // 不是邮箱密码，是你设置的smtp授权码
  TO_EMAIL: process.env.TO_EMAIL || '', // 接收者邮箱
  TO_TITLE: process.env.TO_TITLE || '你的专属', //标题
  OPEN_RECORD: process.env.OPEN_RECORD !== 'false', //是否开启记录，将数据存至json文件中
  WEATHER_API_KEY: process.env.WEATHER_API_KEY || '', //高德web服务API的key
  WEATHER_CITY_ADCODE: process.env.WEATHER_CITY_ADCODE || '440300', //城市的adcode,参考高德城市编码表
  RECEVICE_ERROR_EMAIL: process.env.RECEVICE_ERROR_EMAIL || '', //接收失败的邮箱
  TABLE_NAME: process.env.SUPABASE_TABLE || 'node_daily_email_aq', // Supabase 数据表名
}
