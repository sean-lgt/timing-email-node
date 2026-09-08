const { createClient } = require('@supabase/supabase-js')

require('dotenv').config()

let supabaseClient = null

const getSupabase = () => {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      'Supabase 未配置（缺少 SUPABASE_URL 或 SUPABASE_KEY），数据库操作将跳过。',
    )
    return null
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey)
  return supabaseClient
}

module.exports = { getSupabase }
