const Router = require("koa-router")
const router = new Router()
const {getIndex} = require('../controllers/portal-controller')

router.get('/', getIndex)

module.exports = router.routes()
