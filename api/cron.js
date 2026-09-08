function getHeader(req, name) {
  if (!req || !req.headers) return undefined
  if (typeof req.headers.get === 'function') {
    return req.headers.get(name) || req.headers.get(name.toLowerCase())
  }
  const key = name.toLowerCase()
  return req.headers[key] || req.headers[name]
}

function sendJson(res, status, body) {
  // Node.js Serverless: (req, res) 带 Express 风格 helper
  if (res && typeof res.status === 'function') {
    return res.status(status).json(body)
  }

  // Web Request/Response 运行时（部分 Vercel Cron / Node 环境）
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

async function handler(req, res) {
  const method = req?.method || 'GET'
  if (method !== 'GET' && method !== 'POST') {
    return sendJson(res, 405, { success: false, message: 'Method Not Allowed' })
  }

  const authHeader = getHeader(req, 'authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return sendJson(res, 401, { success: false, message: 'Unauthorized' })
  }

  try {
    const { runDailyTask } = require('../lib/daily-task')
    const result = await runDailyTask()

    return sendJson(res, 200, {
      success: true,
      message: 'Daily email task executed successfully.',
      attempt: result.attempt,
      savedToDb: result.savedToDb,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron Execution Error:', error)
    return sendJson(res, 500, {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  }
}

module.exports = handler
module.exports.default = handler
