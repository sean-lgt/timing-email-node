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
  DB_HOST: 'localhost', //数据库的主机地址
  DB_PORT: 3306, //数据库端口号
  DB_USER: 'root', //数据库登录用户
  DB_PASSWORD: '112233', //数据库登录密码
  DB_DATABASE: 'timing-send-daily', //选中的数据库
  WEATHER_API_KEY: '0546c98c9d4f5b97653009edb3e6e64d', //高德web服务API的key
  WEATHER_CITY_ADCODE: '440300', //城市的adcode,参考高德城市编码表
  RECEVICE_ERROR_EMAIL: '852951042@qq.com', //接收失败的邮箱
}