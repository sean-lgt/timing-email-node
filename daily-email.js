// 引入 axios 请求库  基于Promise的http请求库
const axios = require('axios')
// 一个简单易用的Node.js邮件发送组件
// https://nodemailer.com/smtp/well-known/
const nodemailer = require("nodemailer");

// 引入配置文件
const { config } = require("./config")

const fs = require("fs")
const path = require('path')
const dataFilePath = path.resolve(__dirname, './public/data.json')

// 添加响应拦截器
axios.interceptors.response.use(function(response) {
  // Any status code that lie within the range of 2xx cause this function to trigger
  // Do something with response data
  return response.data;
}, function(error) {
  // Any status codes that falls outside the range of 2xx cause this function to trigger
  // Do something with response error
  return Promise.reject(error);
});

// 获取bing的壁纸
const fetchBingPictrue = async () => {
  const BPicList = await axios.get("https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1")
  let bingInfo = {}
  if (!BPicList.images[0]) {
    console.error("获取bing壁纸失败")
    return bingInfo
  }
  bingInfo.picUrl = `http://cn.bing.com${BPicList.images[0].url}`
  bingInfo.copyright = BPicList.images[0].copyright
  bingInfo.copyrightlink = BPicList.images[0].copyrightlink
  console.log('🚀【获取到的bing壁纸信息】', bingInfo);
  return bingInfo
}

// 获取天气信息
const fetchWeaterByCity = async () => {
  let weather = await axios.get(
    `http://wthrcdn.etouch.cn/weather_mini?city=${encodeURI(config.CITY)}`,
  );
  if (weather.data.forecast.length === 0) {
    console.error("获取今日天气失败")
    return {}
  }
  console.log('🚀【获取到天气信息】', weather.data.forecast[0]);
  return weather.data.forecast[0]
}

// 获取每日一句土味情话
const fetchSentence = async () => {
  const sentence = await axios.get(`https://chp.shadiao.app/api.php`);
  console.log('🚀【获取到每日一句】', sentence);
  return sentence
}

/**
 * @description: 获取日期数据
 * @return {*} 返回日期，星期几，总天数
 */
const getDateInfo = () => {
  const today = new Date().toLocaleDateString();
  const weekday = new Date().toLocaleString("default", { weekday: "long" })
  const dayCount = parseInt((new Date() - new Date(`${config.TOGETHER_TIME}`)) / 1000 / 60 / 60 / 24)

  return { today, weekday, dayCount }
}

/**
 * @description: 写入数据到json文件中
 * @return {*}
 * @param {*} data 需要写入的obj数据
 */
const writeData = (data) => {
  try {
    const oldFileData = fs.readFileSync(dataFilePath, 'UTF-8').toString()
    const oldData = JSON.parse(oldFileData)
    oldData.push(data)
    fs.writeFileSync(dataFilePath, JSON.stringify(oldData))
  } catch (err) {
    console.log('🚀【写入数据出现错误】', err);
  }
}


/**
 * @description: 设置email的内容
 * @return {*}
 * @param {*} bingInfo bing的信息，包含图片及文字描述和链接
 * @param {*} weatherInfo 今天天气信息
 * @param {*} sentence 每日一句土味情话
 * @param {*} dateInfo 日期数据
 */
const setEmailContent = (bingInfo, weatherInfo, sentence, dateInfo) => {

  const content = `
        <style>
        .container {
            background-color: rgb(165, 115, 140);
            background: url("${bingInfo.picUrl}") center no-repeat;
            background-size: 100%;
            width: 960px;
            height: 540px;
            display: flex;
            justify-content: space-between;
            flex-direction: column;
            align-items: center;
            color: white;
        }
        .title {
            font-size: 22px;
            margin-top: 50px;
        }
        .description {
            color: white;
        }
        .content {
            background: rgba(255, 255, 255, 0.5);
            margin: 0 auto;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            padding: 20px;
            box-sizing: border-box;
        }
        .content>p {
            text-align: left;
            font-size: 12px;
            color: white;
            width: 100%;
            margin: 5px auto;
            padding: 0;
        }
        </style>
        <div class="container">
            <div class="title">陪你一起看世界:第${dateInfo.dayCount}期</div>
            <a class="description" target="_blank" href="${bingInfo.copyrightlink}">${bingInfo.copyright}</a>
            <div class="content">
                <p style="display: flex;">
                    <span>😘今天是：${dateInfo.today}，${dateInfo.weekday}，是我们在一起的第: ${dateInfo.dayCount}天~🥰🎈🎈🎈，今天天气:  ${weatherInfo.type} 最${weatherInfo.high}，最${
     weatherInfo.low}，今天的风向是:${weatherInfo.fengxiang}。❤❤❤
                    </span>
                </p>
                <p></p>
                <p>${sentence}</p>
            </div>
        </div>
  `;
  return content
}

/**
 * @description: 通过Nodemailer发送电子邮件
 * @return {*}
 * @param {*} content 邮件内容
 */
const sendEmailByNodemailer = (content) => {
  const transporter = nodemailer.createTransport({
    service: config.EMALI_SERVICE, // 使用了内置传输发送邮件 查看支持列表：https://nodemailer.com/smtp/well-known/
    port: 465, // SMTP 端口
    secureConnection: true, // 使用了 SSL
    auth: {
      user: config.EMAIL_ACCOUNT, //邮箱账号
      pass: config.EMAIL_PASS, // 不是邮箱密码，是你设置的smtp授权码
    },
  });

  let mailOptions = {
    from: `"${config.EMAIL_NAME}" <${config.EMAIL_ACCOUNT}>`, // 发送者 邮件地址
    to: `"${config.TO_TITLE}" <${config.TO_EMAIL}>`, // 逗号隔开的接收人列表
    subject: `想和你一起看世界:第${parseInt(
        (new Date() - new Date(config.TOGETHER_TIME)) / 1000 / 60 / 60 / 24,
      )}期`, // 邮件标题
    // 发送text或者html格式
    // text: 'Hello world?', // plain text body
    // 发送的html内容
    html: content,
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log("error", error);
    }
    console.log("Message sent: %s", info.messageId);
    console.log(info);
  });
}

// 执行发送邮件
const handleSendEmail = async () => {
  try {
    const bingInfo = await fetchBingPictrue()
    const weatherInfo = await fetchWeaterByCity()
    const sentence = await fetchSentence()
    const dateInfo = getDateInfo()
    const emailContent = setEmailContent(bingInfo, weatherInfo, sentence, dateInfo)
    sendEmailByNodemailer(emailContent)
    config.OPEN_RECORD && writeData({ bingInfo, weatherInfo, sentence, dateInfo })
  } catch (error) {
    console.log("发送信息失败")
  }
}

handleSendEmail()