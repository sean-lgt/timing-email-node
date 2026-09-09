/**
 * Vercel Cron 入口：使用 Web Request/Response（当前项目运行时需要这种导出）
 * 不要把 package.json 的 main 指向业务库文件，否则会出现：
 * Invalid export found in module ".../lib/daily-task.cjs"
 */

function getHeader(req, name) {
  if (!req || !req.headers) return undefined
  if (typeof req.headers.get === 'function') {
    return req.headers.get(name) || req.headers.get(name.toLowerCase())
  }
  const key = name.toLowerCase()
  return req.headers[key] || req.headers[name]
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

async function handler(req, res) {
  // 兼容旧版 Node (req, res)
  if (res && typeof res.status === 'function') {
    const method = req?.method || 'GET'
    if (method !== 'GET' && method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Method Not Allowed' })
    }

    const authHeader = getHeader(req, 'authorization')
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    try {
      const { runDailyTask } = require('../lib/daily-task')
      const result = await runDailyTask()
      return res.status(200).json({
        success: true,
        message: 'Daily email task executed successfully.',
        attempt: result.attempt,
        savedToDb: result.savedToDb,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Cron Execution Error:', error)
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      })
    }
  }

  // Web Request / Response（Vercel Cron 当前实际调用方式）
  const method = req?.method || 'GET'
  if (method !== 'GET' && method !== 'POST') {
    return json(405, { success: false, message: 'Method Not Allowed' })
  }

  const authHeader = getHeader(req, 'authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return json(401, { success: false, message: 'Unauthorized' })
  }

  try {
    const { runDailyTask } = require('../lib/daily-task')
    const result = await runDailyTask()
    return json(200, {
      success: true,
      message: 'Daily email task executed successfully.',
      attempt: result.attempt,
      savedToDb: result.savedToDb,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron Execution Error:', error)
    return json(500, {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  }
}

// 明确导出为可调用的函数（满足 “default export must be a function or server”）
module.exports = handler
module.exports.default = handler
