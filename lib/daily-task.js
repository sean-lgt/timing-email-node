const axios = require('axios')
const nodemailer = require('nodemailer')
const fs = require('fs')
const path = require('path')

const { config } = require('../config')
const { getSupabase } = require('./supabase')

const dataFilePath = path.resolve(__dirname, '../public/data.json')
const TABLE_NAME = config.TABLE_NAME
const IS_SERVERLESS = process.env.VERCEL === '1'

const DEFAULT_WEATHER = {
  dayweather: '未知',
  daytemp: '--',
  nighttemp: '--',
  daywind: '未知',
  daypower: '--',
  date: '',
}

const DEFAULT_BING = {
  picUrl: '',
  copyright: '暂无壁纸信息',
  copyrightlink: 'https://www.bing.com',
}

const DEFAULT_SENTENCE = '今天也要开开心心的～'

axios.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error),
)

const fetchBingPictrue = async () => {
  try {
    const BPicList = await axios.get(
      'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN',
    )
    const image = BPicList?.images?.[0]
    if (!image?.url) {
      console.error('获取bing壁纸失败：返回数据为空')
      return { ...DEFAULT_BING }
    }

    const bingInfo = {
      picUrl: `http://cn.bing.com${image.url}`,
      copyright: image.copyright || DEFAULT_BING.copyright,
      copyrightlink: image.copyrightlink || DEFAULT_BING.copyrightlink,
    }
    console.log('🚀【获取到的bing壁纸信息】', bingInfo)
    return bingInfo
  } catch (error) {
    console.error('获取bing壁纸异常', error?.message || error)
    return { ...DEFAULT_BING }
  }
}

const fetchWeaterByCity = async () => {
  if (!config.WEATHER_API_KEY) {
    console.warn('WEATHER_API_KEY 未配置，使用默认天气数据')
    return { ...DEFAULT_WEATHER }
  }

  try {
    const weather = await axios.get(
      `https://restapi.amap.com/v3/weather/weatherInfo?key=${config.WEATHER_API_KEY}&city=${config.WEATHER_CITY_ADCODE}&extensions=all`,
    )

    if (weather?.status !== '1') {
      console.error(
        '获取今日天气失败：接口返回异常',
        weather?.info || weather?.infocode || weather,
      )
      return { ...DEFAULT_WEATHER }
    }

    const forecasts = weather?.forecasts
    if (!Array.isArray(forecasts) || forecasts.length === 0) {
      console.error('获取今日天气失败：forecasts 为空')
      return { ...DEFAULT_WEATHER }
    }

    const casts = forecasts[0]?.casts
    if (!Array.isArray(casts) || casts.length === 0) {
      console.error('获取今日天气失败：casts 为空')
      return { ...DEFAULT_WEATHER }
    }

    const todayCast = casts[0]
    console.log('🚀【获取到天气信息】', todayCast)
    return todayCast
  } catch (error) {
    console.error('获取今日天气异常', error?.message || error)
    return { ...DEFAULT_WEATHER }
  }
}

const fetchSentence = async () => {
  try {
    const sentence = await axios.get('https://api.shadiao.app/chp')
    const text = sentence?.data?.text
    if (!text) {
      console.error('获取每日一句失败：返回数据为空')
      return DEFAULT_SENTENCE
    }
    console.log('🚀【获取到每日一句】', text)
    return text
  } catch (error) {
    console.error('获取每日一句异常', error?.message || error)
    return DEFAULT_SENTENCE
  }
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
  const safeBing = { ...DEFAULT_BING, ...bingInfo }
  const safeWeather = { ...DEFAULT_WEATHER, ...weatherInfo }
  const safeSentence = sentence || DEFAULT_SENTENCE

  return `
        <style>
        .container {
            background-color: rgb(165, 115, 140);
            background: url("${safeBing.picUrl}") center no-repeat;
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
            <a class="description" target="_blank" href="${safeBing.copyrightlink}">${safeBing.copyright}</a>
            <div class="content">
                <p style="display: flex;">
                    <span>😘今天是：${dateInfo.today}，${dateInfo.weekday}，是我们在一起的第: ${dateInfo.dayCount}天~🥰🎈🎈🎈，今天天气:  ${safeWeather.dayweather},最高${safeWeather.daytemp}°C，最低${
    safeWeather.nighttemp
  }°C，今天吹${safeWeather.daywind}风，风力${safeWeather.daypower}级。❤❤❤
                    </span>
                </p>
                <p></p>
                <p>${safeSentence}</p>
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
  const supabase = getSupabase()
  if (!supabase) {
    console.warn('Supabase 未配置，跳过批量导入')
    return null
  }

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
  const supabase = getSupabase()
  if (!supabase) {
    console.warn('Supabase 未配置，跳过查询最新数据')
    return null
  }

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
  const supabase = getSupabase()
  if (!supabase) {
    console.warn('Supabase 未配置，跳过查询全部数据')
    return null
  }

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
  const supabase = getSupabase()
  if (!supabase) {
    throw new Error('Supabase 未配置：请检查 Vercel 环境变量 SUPABASE_URL / SUPABASE_KEY')
  }

  const row = mapRecordToRow(dataJson)
  console.log('🚀【准备写入 Supabase】', { table: TABLE_NAME, day_count: row.day_count })

  const { data, error } = await supabase.from(TABLE_NAME).insert([row]).select()

  if (error) {
    console.error('😟【新增数据失败】', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
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
  console.log('🚀【邮件发送完成】')

  let savedToDb = false
  if (config.OPEN_RECORD) {
    writeData({ bingInfo, weatherInfo, sentence, dateInfo })
    await insertDataToDB({ bingInfo, weatherInfo, sentence, dateInfo })
    savedToDb = true
    console.log('🚀【Supabase 写入完成】')
  } else {
    console.log('🚀【OPEN_RECORD=false，跳过数据库写入】')
  }

  return { bingInfo, weatherInfo, sentence, dateInfo, savedToDb }
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
