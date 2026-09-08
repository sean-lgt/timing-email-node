const { runDailyTask } = require('./lib/daily-task')

/**
 * 仅本地 CLI 使用：npm start
 * 禁止在模块加载时执行任务，否则 Vercel 会把本文件误当 Serverless 入口，
 * 出现 “No exports found in module daily-email.cjs”，进程提前退出导致 Supabase 未入库。
 */
async function main() {
  await runDailyTask()
}

if (require.main === module) {
  main().catch((error) => {
    console.error('本地执行失败', error)
    process.exitCode = 1
  })
}

module.exports = { runDailyTask, main }
