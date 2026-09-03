const { createClient } = require('@supabase/supabase-js')

require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('缺少环境变量 SUPABASE_URL 或 SUPABASE_KEY，请检查 .env 或 GitHub Secrets 配置')
}

const supabase = createClient(supabaseUrl, supabaseKey)

module.exports = { supabase }
