// 配置相关信息
exports.config = {
  CITY: '深圳', //获取城市天气
  TOGETHER_TIME: '2000-01-01', //在一起的时间
  EMAIL_NAME: '陪你一起看世界系列', //邮箱名称
  EMALI_SERVICE: '163', //使用163服务 https://nodemailer.com/smtp/well-known/
  EMAIL_ACCOUNT: 'xxxx@163.com', //使用发送邮箱的账号
  EMAIL_PASS: 'xxxyyyxxxyyzxzxz', // 不是邮箱密码，是你设置的smtp授权码
  TO_EMAIL: 'xxxxxxx@qq.com', // 接送者邮箱
  TO_TITLE: '你的专属', //标题
  OPEN_RECORD: true, //是否开启记录，将数据存至json文件中
}