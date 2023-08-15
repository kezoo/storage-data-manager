require("./src/lib/bootstrap")
const config = require("electron-node-config")
const fs = require("fs")
const path = require("path")
const {replaceAsarDir} = require('./src/utils/fileData')
const {APP_COMMON_CONF} = require('./src/constant/common')

const dbClient = config.get("db.client")
const isSqlite = dbClient === "sqlite3"
const sqliteDbPlace = 'data/db.sqlite3'
let sqliteDbPath = APP_COMMON_CONF.dbFilePath
if (!sqliteDbPath) {
  sqliteDbPath = path.join(__dirname, sqliteDbPlace)
  sqliteDbPath = replaceAsarDir(sqliteDbPath)
}
console.info(`sqliteDbPath: `, sqliteDbPath, '----DB:APP_COMMON_CONF ', APP_COMMON_CONF)
if (isSqlite) {
  if (!fs.existsSync(sqliteDbPath)) {
    const samplePath = replaceAsarDir(path.join(__dirname, `${sqliteDbPlace}.sample`))
    console.log(`Sample database file: `, samplePath)
    if (fs.existsSync(samplePath)) {
      console.log(`Trying to rename sample DB file`)
      fs.copyFileSync(samplePath, sqliteDbPath)
    }
  }
}

const dbConnectionFromConfig = config.has("db.connection") && config.get("db.connection")
const dbConn = dbConnectionFromConfig || {
  filename: sqliteDbPath,
}

const options = {
  client: dbClient,
  connection: dbConn,
  migrations: {
    directory: "src/migrations",
    tableName: "migrations",
  },
  debug: false,
  seeds: {
    directory: "src/seeds",
  },
  useNullAsDefault: isSqlite,
}

if (!isSqlite) {
  options.pool = {
    min: 2,
    max: 10,
  }
}

module.exports = options
