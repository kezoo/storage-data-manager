const config = require("electron-node-config")
const Koa = require("koa")
const path = require('path')
const websockify = require('koa-websocket');
const app = websockify(new Koa())


app.proxy = true

app.keys = [config.get("secret")]

const responseTime = require("koa-response-time")
const helmet = require("koa-helmet")
const logger = require("koa-logger")
const xRequestId = require("koa-x-request-id")
const camelizeMiddleware = require("../middleware/camelize-middleware")
const error = require("../middleware/error-middleware")
const cors = require("kcors")
const bodyParser = require("koa-bodyparser")
const pagerMiddleware = require("../middleware/pager-middleware")
const routes = require("../routes")
const views = require('koa-views')
const nunjucks = require('nunjucks')
const viewsDir = path.join(__dirname, '../templates')
const nunjucksEnvironment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(viewsDir)
)
const render = views(viewsDir, {
  options: {
    nunjucksEnv: nunjucksEnvironment
  },
  extension: 'njk',
  map: {
    njk: 'nunjucks'
  }
})


app.use(render)
app.use(responseTime())
app.use(xRequestId({ inject: true }, app))
app.use(logger())
app.use(helmet())

app.use(
  cors({
    origin: "*",
    exposeHeaders: ["Authorization"],
    credentials: true,
    allowMethods: ["GET", "PUT", "POST", "DELETE"],
    allowHeaders: ["Authorization", "Content-Type"],
    keepHeadersOnError: true,
  }),
)

app.use(camelizeMiddleware)

app.use(error)
app.use(
  bodyParser({
    enableTypes: ["json"],
  }),
)
app.use(pagerMiddleware)
// app.ws.use(wsRouter.routes()).use(wsRouter.allowedMethods())
app.use(routes.routes()).use(routes.allowedMethods())

module.exports = app
