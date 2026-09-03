const axios = require('axios')
const nodemailer = require('nodemailer')
const fs = require('fs')
const path = require('path')

const { config } = require('../config')
const { supabase } = require('./supabase')

const dataFilePath = path.resolve(__dirname, '../public/data.json')
const TABLE_NAME = config.TABLE_NAME
const IS_SERVERLESS = process.env.VERCEL === '1'

axios.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error),
)

const fetchBingPictrue = async () => {
  const BPicList = await axios.get(
    'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN',
  )
  const bingInfo = {}
  if (!BPicList.images[0]) {
    console.error('获取bing壁纸失败')
    return bingInfo
  }
  bingInfo.picUrl = `http://cn.bing.com${BPicList.images[0].url}`
  bingInfo.copyright = BPicList.images[0].copyright
  bingInfo.copyrightlink = BPicList.images[0].copyrightlink
  console.log('🚀【获取到的bing壁纸信息】', bingInfo)
  return bingInfo
}

const fetchWeaterByCity = async () => {
  const weather = await axios.get(
    `https://restapi.amap.com/v3/weather/weatherInfo?key=${config.WEATHER_API_KEY}&city=${config.WEATHER_CITY_ADCODE}&extensions=all`,
  )
  if (weather.forecasts.length === 0) {
    console.error('获取今日天气失败')
    return {}
  }
  console.log('🚀【获取到天气信息】', weather.forecasts[0].casts[0])
  return weather.forecasts[0].casts[0]
}

const fetchSentence = async () => {
  const sentence = await axios.get('https://api.shadiao.app/chp')
  console.log('🚀【获取到每日一句】', sentence.data.text)
  return sentence.data.text
}

const getDateInfo = () => {
  const now = new Date()
  const today = now.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
  const weekday = now.toLocaleString('zh-CN', {
    weekday: 'long',
    timeZone: 'Asia/Shanghai',
  })
  const dayCount = parseInt(
    (now - new Date(`${config.TOGETHER_TIME}`)) / 1000 / 60 / 60 / 24,
  )
  return { today, weekday, dayCount }
}

const writeData = (data) => {
  if (IS_SERVERLESS) {
    console.log('🚀【Serverless 环境跳过本地 JSON 写入，数据已存 Supabase】')
    return
  }
  try {
    const oldFileData = fs.readFileSync(dataFilePath, 'UTF-8').toString()
    const oldData = JSON.parse(oldFileData)
    oldData.push(data)
    fs.writeFileSync(dataFilePath, JSON.stringify(oldData))
  } catch (err) {
    console.log('🚀【写入数据出现错误】', err)
  }
}

const setEmailContent = (bingInfo, weatherInfo, sentence, dateInfo) => {
  return `
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
    weatherInfo.nighttemp
  }°C，今天吹${weatherInfo.daywind}风，风力${weatherInfo.daypower}级。❤❤❤
                    </span>
                </p>
                <p></p>
                <p>${sentence}</p>
            </div>
        </div>
  `
}

const setErrorEmailContent = (errorInfo) => {
  return `
  <div class="container">
      <div class="content">
          <p style="display: flex;">
              每日邮件出现错误了：${errorInfo}
          </p>
      </div>
  </div>
`
}

const createTransporter = () =>
  nodemailer.createTransport({
    service: config.EMALI_SERVICE,
    port: 465,
    secureConnection: true,
    auth: {
      user: config.EMAIL_ACCOUNT,
      pass: config.EMAIL_PASS,
    },
  })

const sendEmailByNodemailer = (content) => {
  const transporter = createTransporter()
  const mailOptions = {
    from: `"${config.EMAIL_NAME}" <${config.EMAIL_ACCOUNT}>`,
    to: `"${config.TO_TITLE}" <${config.TO_EMAIL}>`,
    subject: `想和你一起看世界:第${parseInt(
      (new Date() - new Date(config.TOGETHER_TIME)) / 1000 / 60 / 60 / 24,
    )}期`,
    html: content,
  }

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('error', error)
        reject(error)
        return
      }
      console.log('Message sent: %s', info.messageId)
      console.log(info)
      resolve(info)
    })
  })
}

const sendErrorEmailByNodemailer = (content) => {
  const transporter = createTransporter()
  const mailOptions = {
    from: `"【错误警告】${config.EMAIL_NAME}" <${config.EMAIL_ACCOUNT}>`,
    to: `"${config.TO_TITLE}【错误警告】" <${config.RECEVICE_ERROR_EMAIL}>`,
    subject: '【错误警告】想和你一起看世界',
    html: content,
  }

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('error', error)
        reject(error)
        return
      }
      console.log('Message sent: %s', info.messageId)
      resolve(info)
    })
  })
}

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
      : weather.fengxiang || '',
    sentence: dataJson.sentence,
    date_today: dataJson.dateInfo.today,
    date_weekday: dataJson.dateInfo.weekday,
  }
}

const importDataToDB = async () => {
  const dataList = require('../public/data.json')
  const rows = dataList.map(mapRecordToRow)
  const { data, error } = await supabase.from(TABLE_NAME).insert(rows).select()
  if (error) {
    console.log('😟【批量导入失败】', error)
    throw error
  }
  console.log('🚀【总数据长度】', dataList.length)
  console.log('🚀【插入成功数据】', data?.length || 0)
  return data
}

const getLatestData = async () => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('id', { ascending: false })
    .limit(1)

  if (error) {
    console.log('😟【查询最新数据失败】', error)
    throw error
  }
  console.log('🚀【最新数据】', data)
  return data
}

const getAllDataList = async () => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('id', { ascending: true })

  if (error) {
    console.log('😟【查询全部数据失败】', error)
    throw error
  }
  console.log('🚀【总数据】', data)
  return data
}

const insertDataToDB = async (dataJson) => {
  const row = mapRecordToRow(dataJson)
  const { data, error } = await supabase.from(TABLE_NAME).insert([row]).select()

  if (error) {
    console.log('😟【新增数据失败】', error)
    throw error
  }
  console.log('🚀【数据新增成功】', data)
  return data
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const executeDailyTask = async () => {
  const bingInfo = await fetchBingPictrue()
  const weatherInfo = await fetchWeaterByCity()
  const sentence = await fetchSentence()
  const dateInfo = getDateInfo()
  const emailContent = setEmailContent(
    bingInfo,
    weatherInfo,
    sentence,
    dateInfo,
  )

  await sendEmailByNodemailer(emailContent)

  if (config.OPEN_RECORD) {
    writeData({ bingInfo, weatherInfo, sentence, dateInfo })
    await insertDataToDB({ bingInfo, weatherInfo, sentence, dateInfo })
  }

  return { bingInfo, weatherInfo, sentence, dateInfo }
}

/**
 * 执行每日邮件任务，失败时自动重试，超过次数发送错误告警邮件
 */
const runDailyTask = async (options = {}) => {
  const maxRetries = options.maxRetries ?? 5
  let lastError = null

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const result = await executeDailyTask()
      return {
        success: true,
        attempt,
        ...result,
      }
    } catch (error) {
      lastError = error
      console.log(`发送信息失败（第 ${attempt}/${maxRetries} 次）`, error)

      if (attempt < maxRetries) {
        await sleep(10 * 1000)
        console.log('重新发起请求')
      }
    }
  }

  if (config.RECEVICE_ERROR_EMAIL) {
    const errContent = setErrorEmailContent(String(lastError?.message || lastError))
    await sendErrorEmailByNodemailer(errContent).catch((err) => {
      console.log('发送错误告警邮件失败', err)
    })
  }

  throw lastError
}

module.exports = {
  runDailyTask,
  executeDailyTask,
  fetchBingPictrue,
  fetchWeaterByCity,
  fetchSentence,
  getDateInfo,
  setEmailContent,
  sendEmailByNodemailer,
  sendErrorEmailByNodemailer,
  importDataToDB,
  getLatestData,
  getAllDataList,
  insertDataToDB,
  mapRecordToRow,
}
