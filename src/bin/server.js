require("../lib/bootstrap")
const {initServerAddr, solveAppConf, downloadMissingImages} = require('../utils/fileData')
const {updateDatabase} = require('../lib/updateDatabase')

async function runServer () {
  await solveAppConf()
  console.log(`FINISHED Solving APP config`, require('../constant/common').APP_COMMON_CONF)
  const pEvent = require("p-event")
  const createServerAndListen = require("../lib/server")
  const app = require("../lib/app")
  const {getLocaleData} = require('../utils/locale')
  const {APP_COMMON_CONF} = require('../constant/common')

  await initServerAddr()
  console.debug(`APP_COMMON_CONF.serverConf: `, APP_COMMON_CONF)
  const {port, host} = APP_COMMON_CONF.serverConf.server || {port: 8791, host: 'localhost'}
  let server

  try {
    const db = require("../lib/db")
    await updateDatabase()
    await db.select(db.raw("1"))
    console.debug("Database connected")

    server = await createServerAndListen(app, port, host)
    getLocaleData()
    downloadMissingImages()
    APP_COMMON_CONF.serverIsReady = 1
    console.debug(`Server is listening on: ${host}:${port}`)

    await Promise.race([
      ...["SIGINT", "SIGHUP", "SIGTERM"].map(s =>
        pEvent(process, s, {
          rejectionEvents: ["uncaughtException", "unhandledRejection"],
        }),
      ),
    ])
  } catch (err) {
    process.exitCode = 1
    console.debug(err)
  } finally {
    if (server) {
      console.debug("Close server")
      await server.stop()
      console.debug("Server closed")
    }

    console.debug("Close database")
    await db.destroy()
    console.debug("Database closed")

    setTimeout(() => process.exit(), 10000).unref()
  }
}
runServer()
