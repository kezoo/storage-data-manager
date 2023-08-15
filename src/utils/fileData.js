const {tl} = require('./locale')
const path = require('path')
const config = require("electron-node-config")
const {APP_COMMON_CONF, APP_OTHER_CONF} = require('../constant/common')
const {app: electronApp} = require("electron")
const fs = require('fs')
const fsExtra = require('fs-extra')
const {validJson} = require('./basicHelpers')

module.exports.getDataType = ({byId, byProp, locale}) => {
  const types = [
    {
      id: 1,
      prop: 'book',
      title: tl({locale, key: 'dataTypeBook'}),
      extraAssign: {isBook: true}
    },
    {
      id: 2,
      prop: 'video',
      title: tl({locale, key: 'dataTypeVideo'}),
      extraAssign: {isVideo: true}
    },
    {
      id: 3,
      prop: 'audio',
      title: tl({locale, key: 'dataTypeAudio'}),
      extraAssign: {isAudio: true}
    },
    {
      id: 4,
      prop: 'game',
      title: tl({locale, key: 'dataTypeGame'}),
      extraAssign: {isGame: true}
    },
    {
      id: 5,
      prop: 'app',
      title: tl({locale, key: 'dataTypeApp'}),
      extraAssign: {isApp: true}
    },
    {
      id: 6,
      prop: 'other',
      title: tl({locale, key: 'dataTypeOther'}),
      extraAssign: {isOther: true}
    }
  ]
  const res = {types, findType: null}

  if (byId) {
    res.findType = types.find(tItem => tItem.id === byId)
  }
  if (byProp) {
    res.findType = types.find(tItem => tItem.prop === byProp)
  }
  return res
}

async function checkPortUsage (params) {
  const {port} = params || {}
  const res = {port: null}
  const using = await isPortInUse(port)

  if (!using) {
    return res
  }
  if (port) {
    const pf = require('portfinder')
    const pRes = await pf.getPortPromise()
    res.port = pRes
  }

  return res
}

async function isPortInUse (port) {
  const tcpPortUsed = require('tcp-port-used')
  const inUse = await tcpPortUsed.check(port, '127.0.0.1')
  return inUse
}
async function sleep (ms = 1000) {
  return new Promise(resolve=>{
    setTimeout(resolve, ms)
  })
}
async function initServerAddr () {
  const host = config.get("server.host")
  let port = config.get("server.port")

  const res = await checkPortUsage({port})
  port = res.port || port
  if (!APP_COMMON_CONF.serverConf) {
    APP_COMMON_CONF.serverConf = Object.assign({}, config, {server: {host, port}})
  }
}
function randomId (len) {
  const tLen = len || 8
  const id = Math.random().toString(36).substr(2, tLen) + Math.random().toString(36).substr(2, tLen) + ''
  return id
}
async function checkServerConf () {
  if (!APP_COMMON_CONF.serverIsReady) {
    console.debug(`Server conf isn't ready yet.`)
    await sleep(300)
    await checkServerConf()
  }
}
function replaceAsarDir (pathStr) {
  return pathStr && pathStr.replace('app.asar', 'app.asar.unpacked')
}

async function solveAppConf () {
  const dataDirPath = path.join(__dirname, '../../data')
  console.log(`solveAppConf dataDirPath: `, dataDirPath, ':::::::: APP: ')
  const extraDataJsonPath = path.join(dataDirPath, APP_COMMON_CONF.extraDataFileName)

  function checkExtraDataFile () {
    const extraDataJsonSamplePath = replaceAsarDir(`${extraDataJsonPath}.sample`)
    if (!fs.existsSync(replaceAsarDir(extraDataJsonPath)) && fs.existsSync(extraDataJsonSamplePath)) {
      console.log(`Found sample extraDataJson`, extraDataJsonSamplePath)
      // fsExtra.renameSync(extraDataJsonSamplePath, replaceAsarDir(extraDataJsonPath))
      fsExtra.copyFileSync(extraDataJsonSamplePath, replaceAsarDir(extraDataJsonPath))
    }
  }
  if (!electronApp) {
    checkExtraDataFile()
  }
  if (electronApp && fs.existsSync(dataDirPath)) {
    const appPath = electronApp.getAppPath()
    const userPath = electronApp.getPath('userData')
    const dbPath = path.join(dataDirPath, APP_COMMON_CONF.dbFileName)

    let isWritable = true
    console.log(`solveAppConf \nappPath: ${appPath} \nuserPath: ${userPath} \ndbPath:${dbPath}`, )
    const newDataDir = path.join(userPath, APP_COMMON_CONF.appDataDirName)
    console.log(`NEW DATA DIR WILL BE: `, newDataDir)

    let isDirOk = false
    try {
      const dirStat = fs.statSync(newDataDir)
      isDirOk = dirStat && dirStat.isDirectory()
    }
    catch (err) {
      console.error(`solveAppConf ERROR dataDir not Exist: `)
    }

    if (!isDirOk) {
      fsExtra.mkdirpSync(newDataDir)
    }
    const oFileList = [{
      file: APP_COMMON_CONF.dbFileName,
      prop: 'dbFilePath',
      checkSample: true,
    }, {
      file: APP_COMMON_CONF.extraDataFileName,
      prop: 'extraDataFilePath',
      checkSample: true,
    }]
    let requiredFiles = []
    if (fs.existsSync(newDataDir)) {
      try {
        const files = fs.readdirSync(newDataDir)
        console.log(`files `, files)
        requiredFiles = oFileList.filter(aFile => !files.includes(aFile.file))
      }
      catch (err) {
        console.error(`solveAppConf ERROR readDir newDataDir`)
      }
      console.log(`Files Going to add: `, requiredFiles)

      const newPaths = oFileList.reduce((aItem, objA) => {
        const objV = {...aItem, [objA.prop]: path.join(newDataDir, objA.file)}
        return objV
      }, {})
      if (requiredFiles.length) {
        const rFileNames = []
        for (const file of requiredFiles) {
          let fPath = path.join(dataDirPath, file.file)
          if (!fs.existsSync(fPath) && file.checkSample) {
            fPath = path.join(dataDirPath, file.file + '.sample')
            console.log(`Sample file path ${file.file}: `, fPath)
          }
          console.log(`FILE ${file.file} ${fPath} `, fs.existsSync(fPath))
          if (fs.existsSync(fPath)) {
            const nPath = path.join(newDataDir, file.file)
            const gotNPath = fs.existsSync(nPath)
            console.log(`gotNPath ${gotNPath} \nnPath ${nPath} \nfPath ${fPath}`)
            if (!gotNPath) {
              fsExtra.copyFileSync(fPath, nPath)
            }
            rFileNames.push(file.file)
          }
        }
        requiredFiles = requiredFiles.filter(fT => !rFileNames.includes(fT.file))
      }
      if (requiredFiles.length) {
        console.error(`solveAppConf ERROR CANNOT SYNC FILES`)
        return electronApp.exit()
      }
      console.log(`newPaths: `, newPaths)
      try {
        const toUp = {...newPaths}
        const extraJson = await handleExtraJson({toUp})
        APP_COMMON_CONF.dbFilePath = toUp.dbFilePath || ''
        APP_COMMON_CONF.extraDataFilePath = toUp.extraDataFilePath || ''
      }
      catch (err) {
        console.error(`solveAppConf ERR when Up ExtraJson: `, err)
      }
    }
  }
  console.log(`APP_COMMON_CONF ~~~~~~~ : `, JSON.stringify(APP_COMMON_CONF))
}
function altAssetsDir (params) {
  const {} = params || {}
  const res = {mediaDir: null}
  if (electronApp) {
    const userPath = electronApp.getPath('userData')
    const mediaPath = path.join(userPath, 'medias')
    if (!fs.existsSync(mediaPath)) {
      fsExtra.mkdirSync(mediaPath)
    }
    res.mediaDir = mediaPath
  }
  return res
}

async function handleExtraJson (params) {
  const {labelName, potentialDup, proxy, toUp, bounds, maxStrLen, tmdbKey, } = params || {}
  const {APP_COMMON_CONF: ACC} = require('../constant/common')
  let ePath = ACC.extraDataFilePath || (toUp && toUp.extraDataFilePath) || path.join(__dirname, '../../data/hdd-extra-data.json')
  ePath = replaceAsarDir(ePath)
  let jsonData = {}
  let hasUp = false
  try {
    jsonData = require(ePath)
  }
  catch (err) {
    jsonData = {}
    hasUp = true
  }
  if (toUp) {
    Object.assign(jsonData, toUp)
    hasUp = true
  }

  if (labelName) {
    jsonData.driveLabels = jsonData.driveLabels || []
    if (!jsonData.driveLabels.includes(labelName)) {
      jsonData.driveLabels.push(labelName)
      hasUp = true
    }
  }
  if (potentialDup && jsonData.potentialDup !== potentialDup) {
    jsonData.potentialDup = potentialDup
    hasUp = true
  }
  if (typeof tmdbKey === 'string' && jsonData.tmdbKey !== tmdbKey) {
    jsonData.tmdbKey = tmdbKey
    hasUp = true
  }
  if (typeof proxy === 'string' && jsonData.proxy !== proxy) {
    jsonData.proxy = proxy
    hasUp = true
  }
  if (bounds) {
    jsonData.bounds = bounds
    hasUp = true
  }
  // console.log(`jsonData ${hasUp} `, toUp && JSON.stringify(toUp), jsonData)
  if (hasUp) {
    try {
      await fsExtra.writeJSONSync(ePath, jsonData)
    }
    catch (err) {
      console.error(`ERROR handleDriveLabels : `, err)
    }
  }
  return jsonData
}
function onWindowResizeOrMove (params) {
  const {mainWindow, evtName} = params
  const dNow = Date.now()
  const shouldSync = APP_OTHER_CONF.lastTimeSyncPosition ? (dNow - APP_OTHER_CONF.lastTimeSyncPosition >= 1900) : true
  if (shouldSync && mainWindow) {
    const bounds = mainWindow.getBounds()
    APP_OTHER_CONF.lastTimeSyncPosition = Date.now()
    handleExtraJson({bounds})
  }
}
async function restoreWindowPosition ({displays}) {
  const {bounds} = await handleExtraJson()
  console.log(`restoreWindowPositionFn BOUNDS::::::::`, bounds)
  const defaultDimension = {width: 800, height: 600, x: 0, y: 0}
  const fDisplay = displays[0]
  const boundsObj = typeof bounds === 'object' ? bounds : {}
  let cWidth = boundsObj.width || defaultDimension.width
  let cHeight = boundsObj.height || defaultDimension.height
  let cX = boundsObj.x || defaultDimension.x
  let cY = boundsObj.y || defaultDimension.y
  const extension = 100
  console.log(`restoreWindowPositionFn cX:${cX} cY:${cY}`)
  const matchDisplay = displays.find(display => {
    const {width, height, x, y} = display.workArea
    const isWidthOk = cWidth <= width
    const isHeightOk = cHeight <= height
    const safeX = x < 0 ? x - extension : width - cWidth + extension
    const safeY = y < 0 ? y - extension : height - cHeight + extension
    const isXOk = (x >= 0 ? cX >= 0 : cX < 0) && Math.abs(cX) < Math.abs(safeX)
    const isYOk = (y >= 0 ? cY >= 0 : cY < 0) && Math.abs(cY) < Math.abs(safeY)
    // console.log(`restoreWindowPositionFn PARAMS::::::::::\n${JSON.stringify(display.workArea)} safeX:${safeX} safeY:${safeY}`)
    return isWidthOk && isHeightOk && isXOk && isYOk
  })
  const tDisplay = matchDisplay || fDisplay

  if (tDisplay) {
    const {width, height, x, y} = tDisplay.workArea
    if (cWidth > width) {
      cWidth = width - extension
    }
    if (cHeight > height) {
      cHeight = height - extension
    }
    cX = (width - cWidth) / 2
    if (x < 0) {
      cX = -cX - cWidth
    }
    cY = (height - cHeight) / 2
    if (y < 0) {
      cY = -cY - cHeight
    }
  }
  const res = {width: cWidth, height: cHeight, x: cX, y: cY}
  // console.log(`restoreWindowPositionFn getDisplay: `, tDisplay, 'matchDisplay::::', matchDisplay, 'res========', res)
  return res
}
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function downloadMissingImages (params) {
  const {videos, artists} = params || {}
  const db = require('../lib/db')
  const {downloadFile} = require('../lib/requests')
  const missingCovers = videos || (await db('videos').whereNull('cover'))

  for (const item of missingCovers) {
    console.log(`downloadMissingImages item `, item.mediaid)
    const details = item.detail

    if (details && validJson(details)) {
      const detailsObj = JSON.parse(details)

      if (detailsObj.poster_path) {
        downloadFile({
          filename: item.mediaid,
          mdbItemPath: detailsObj.poster_path,
          type: 'cover',
          async onDone (res) {
            console.log(`Finished DL img VideoId ${item.mediaid} `)
            if (!res.err) {
              await db('videos').where({mediaid: item.mediaid}).update({cover: item.mediaid})
            }
          }
        })
      }
    }
  }

  const missingAvatars = artists || (await db('video_artist').whereNull('avatar').whereNotNull('profile_path'))
  for (const item of missingAvatars) {
    downloadFile({
      filename: item.id,
      mdbItemPath: item.profile_path,
      type: 'credit',
      async onDone (res) {
        console.log(`Finished DL img ItemId ${item.id} `)
        if (!res.err) {
          await db('video_artist').where({id: item.id}).update({avatar: item.id})
        }
      }
    })
  }
}
module.exports.replaceAsarDir = replaceAsarDir
module.exports.checkPortUsage = checkPortUsage
module.exports.initServerAddr = initServerAddr
module.exports.checkServerConf = checkServerConf
module.exports.solveAppConf = solveAppConf
module.exports.altAssetsDir = altAssetsDir
module.exports.handleExtraJson = handleExtraJson
module.exports.sleep = sleep
module.exports.downloadMissingImages = downloadMissingImages
module.exports.onWindowResizeOrMove = onWindowResizeOrMove
module.exports.restoreWindowPosition = restoreWindowPosition
module.exports.escapeRegExp = escapeRegExp
