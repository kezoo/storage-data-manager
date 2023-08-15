const Router = require("koa-router")
const router = new Router()
const api = new Router()

const path = require('path')
const kSend = require('koa-send')
const oneDayMs = 1000 * 60 * 60 * 24
const oneYearMs = oneDayMs * 365

const users = require("./router-user")
const files = require("./router-file")
const base = require("./router-base")

api.use(users)
api.use(files)
api.use(base)

router.use("", api.routes())

router.get('/medias/(.*)', ctx => {
  const {mediaDir} = require('../utils/fileData').altAssetsDir()
  const isLocalDir = /\/credits|\/covers|\/res_or/gi.test(ctx.path)
  const bDir = isLocalDir && mediaDir ? mediaDir : __dirname
  const baseDirPath = path.join(bDir, '../')
  // console.log(`mediasDirPath: `, baseDirPath)
  return kSend(ctx, ctx.path, {
    root: baseDirPath,
    immutable: true,
    maxAge: oneYearMs,
  })
})

module.exports = router
