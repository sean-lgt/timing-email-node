// 引入 axios 请求库  基于Promise的http请求库
const axios = require('axios')
// 一个简单易用的Node.js邮件发送组件
// https://nodemailer.com/smtp/well-known/
const nodemailer = require("nodemailer");

// 引入配置文件
const { config } = require("./config")

// 引入 Supabase 客户端
const { supabase } = require('./lib/supabase')

const fs = require("fs")
const path = require('path')
const dataFilePath = path.resolve(__dirname, './public/data.json')
const TABLE_NAME = config.TABLE_NAME

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

// 获取bing的壁纸（固定中文市场，避免 GitHub Actions 英文环境返回英文版权）
const fetchBingPictrue = async () => {
  const BPicList = await axios.get("https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN")
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
  // 原接口过期，http://wthrcdn.etouch.cn/weather_mini?city=${encodeURI(config.CITY)}
  // 更换为高德天气API，需要申请 key
  // 文档：https://lbs.amap.com/api/webservice/guide/api/weatherinfo
  let weather = await axios.get(
    `https://restapi.amap.com/v3/weather/weatherInfo?key=${config.WEATHER_API_KEY}&city=${config.WEATHER_CITY_ADCODE}&extensions=all`,
  );
  if (weather.forecasts.length === 0) {
    console.error("获取今日天气失败")
    return {}
  }
  console.log('🚀【获取到天气信息】', weather.forecasts[0].casts[0]);
  return weather.forecasts[0].casts[0]
  // return weather.data.forecast[0]
}

// 获取每日一句土味情话
const fetchSentence = async () => {
  const sentence = await axios.get(`https://api.shadiao.app/chp`);
  console.log('🚀【获取到每日一句】', sentence.data.text);
  return sentence.data.text
}

/**
 * @description: 获取日期数据（固定中文 + 北京时区，避免 CI 英文环境）
 * @return {*} 返回日期，星期几，总天数
 */
const getDateInfo = () => {
  const now = new Date()
  const today = now.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
  const weekday = now.toLocaleString('zh-CN', { weekday: 'long', timeZone: 'Asia/Shanghai' })
  const dayCount = parseInt((now - new Date(`${config.TOGETHER_TIME}`)) / 1000 / 60 / 60 / 24)

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
                    <span>😘今天是：${dateInfo.today}，${dateInfo.weekday}，是我们在一起的第: ${dateInfo.dayCount}天~🥰🎈🎈🎈，今天天气:  ${weatherInfo.dayweather},最高${weatherInfo.daytemp}°C，最低${
     weatherInfo.nighttemp}°C，今天吹${weatherInfo.daywind}风，风力${weatherInfo.daypower}级。❤❤❤
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
 * @description: 当程序出现错误时，组织错误信息发送邮件
 * @return {*}
 * @param {*} errorInfo
 */
const setErrorEmailContent = (errorInfo) => {
  const content = `
  <div class="container">
      <div class="content">
          <p style="display: flex;">
              每日邮件出现错误了：${errorInfo}
          </p>
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

/**
 * @description: 通过Nodemailer发送【失败】电子邮件
 * @return {*}
 * @param {*} content 邮件内容
 */
const sendErrorEmailByNodemailer = (content) => {
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
    from: `"【错误警告】${config.EMAIL_NAME}" <${config.EMAIL_ACCOUNT}>`, // 发送者 邮件地址
    to: `"${config.TO_TITLE}【错误警告】" <${config.RECEVICE_ERROR_EMAIL}>`, // 逗号隔开的接收人列表
    subject: `【错误警告】想和你一起看世界`, // 邮件标题
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

/**
 * @description: 将业务数据映射为表字段
 */
const mapRecordToRow = (dataJson) => {
  const weather = dataJson.weatherInfo || {}
  return {
    day_count: dataJson.dateInfo.dayCount,
    bing_picture_url: dataJson.bingInfo.picUrl,
    bing_copyright: dataJson.bingInfo.copyright,
    bing_copyrighy_link: dataJson.bingInfo.copyrightlink,
    weather_date: weather.date || weather.weather_date || '',
    weather_type: weather.dayweather || weather.type || '',
    weather_high: weather.daytemp || weather.high || '',
    weather_low: weather.nighttemp || weather.low || '',
    weather_fengli: weather.daypower || weather.fengli || '',
    weather_fengxiang: weather.daywind
      ? `${weather.daywind}风`
      : (weather.fengxiang || ''),
    sentence: dataJson.sentence,
    date_today: dataJson.dateInfo.today,
    date_weekday: dataJson.dateInfo.weekday,
  }
}

// 导入历史 JSON 数据到 Supabase（手动调用）
const importDataToDB = async () => {
  const dataList = require('./public/data.json')
  const rows = dataList.map(mapRecordToRow)
  const { data, error } = await supabase.from(TABLE_NAME).insert(rows).select()
  if (error) {
    console.log('😟【批量导入失败】', error);
    throw error
  }
  console.log('🚀【总数据长度】', dataList.length);
  console.log('🚀【插入成功数据】', data?.length || 0);
}

// 查询最新一条数据
const getLatestData = async () => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('id', { ascending: false })
    .limit(1)

  if (error) {
    console.log('😟【查询最新数据失败】', error);
    throw error
  }
  console.log('🚀【最新数据】', data);
  return data
}

// 查询全部数据
const getAllDataList = async () => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('id', { ascending: true })

  if (error) {
    console.log('😟【查询全部数据失败】', error);
    throw error
  }
  console.log('🚀【总数据】', data);
  return data
}

// 新增数据进入数据库
const insertDataToDB = async (dataJson) => {
  const row = mapRecordToRow(dataJson)
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([row])
    .select()

  if (error) {
    console.log('😟【新增数据失败】', error);
    throw error
  }
  console.log('🚀【数据新增成功】', data);
  return data
}

// 执行发送邮件
let errorCount = 0
const handleSendEmail = async () => {
  try {
    const bingInfo = await fetchBingPictrue()
    const weatherInfo = await fetchWeaterByCity()
    const sentence = await fetchSentence()
    const dateInfo = getDateInfo()
    const emailContent = setEmailContent(bingInfo, weatherInfo, sentence, dateInfo)
    sendEmailByNodemailer(emailContent)
    config.OPEN_RECORD && writeData({ bingInfo, weatherInfo, sentence, dateInfo })
    if (config.OPEN_RECORD) {
      await insertDataToDB({ bingInfo, weatherInfo, sentence, dateInfo })
    }

    errorCount = 0
  } catch (error) {
    console.log("发送信息失败", error)
    errorCount += 1
    if(errorCount > 4){
      // 超过次数 发送错误邮箱
      const errrContent = setErrorEmailContent(error || '')
      sendErrorEmailByNodemailer(errrContent)
    }else{
      setTimeout(() => {
        console.log('重新发起请求')
        handleSendEmail()
      }, 10 * 1000);
    }
  }
}

handleSendEmail()