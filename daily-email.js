const { runDailyTask } = require('./lib/daily-task')

runDailyTask().catch((error) => {
  console.error('本地执行失败', error)
  process.exitCode = 1
})
