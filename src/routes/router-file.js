const Router = require("koa-router")
const ctrl = require("../controllers").files
const {scanDir, getDrives, getFolders, clearElectronCache} = require('../controllers/fs-controller')
const router = new Router()

router.get("/video/search", ctrl.search)
router.get("/file/search", ctrl.searchFiles)
router.get("/file/fix", ctrl.fixFileVideoInfo)
router.post("/video", ctrl.post)
router.del("/video", ctrl.del)
router.del("/file", ctrl.delFile)
router.put("/video", ctrl.put)
router.post("/file/scan", scanDir)
router.post("/files", ctrl.upFiles)

router.get("/drives", getDrives)
router.get("/folders", getFolders)
router.get("/clear-cache", clearElectronCache)

module.exports = router.routes()
