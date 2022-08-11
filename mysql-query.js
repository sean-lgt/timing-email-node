const mysql = require('mysql2');
const { config } = require('./config')
const pool = mysql.createPool({
  host: config.DB_HOST, // 数据库地址
  port: config.DB_PORT, //数据库端口
  user: config.DB_USER, // 数据库用户
  password: config.DB_PASSWORD, // 数据库密码
  database: config.DB_DATABASE // 选中数据库
})
const sqlQuery = function(sql, values) {
  return new Promise((resolve, reject) => {
    pool.getConnection(function(err, connection) {
      if (err) {
        console.log('🙃【数据库连接失败】', err);
        reject(err)
      } else {
        connection.query(sql, values, (err, rows) => {
          if (err) {
            console.log('👉【数据库查询失败】', err);
            reject(err)
          } else {
            resolve(rows)
          }
          connection.release()
        })
      }
    })
  })
}
module.exports = { sqlQuery }