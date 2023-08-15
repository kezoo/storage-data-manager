const Router = require("koa-router")
const ctrl = require("../controllers").users
const router = new Router()

router.get('/config', ctrl.getConfig)
router.post('/settings', ctrl.upSettings)
router.get('/change-lang', ctrl.changeLang)

module.exports = router.routes()
