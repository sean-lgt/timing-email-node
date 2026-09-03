const { runDailyTask } = require('../lib/daily-task')

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' })
  }

  const authHeader = req.headers.authorization
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }

  try {
    const result = await runDailyTask()

    return res.status(200).json({
      success: true,
      message: 'Daily email task executed successfully.',
      attempt: result.attempt,
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
