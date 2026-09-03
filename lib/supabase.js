const { createClient } = require('@supabase/supabase-js')

require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

const missing = []
if (!supabaseUrl) missing.push('SUPABASE_URL')
if (!supabaseKey) missing.push('SUPABASE_KEY')

if (missing.length) {
  throw new Error(
    `缺少环境变量: ${missing.join(', ')}。` +
    `本地请检查 .env；GitHub Actions 请到 Settings → Secrets and variables → Actions 添加同名 Repository secrets。`
  )
}

const supabase = createClient(supabaseUrl, supabaseKey)

module.exports = { supabase }
