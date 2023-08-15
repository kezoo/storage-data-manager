const fs = require('fs')
const fsExtra = require('fs-extra')
const path = require('path')
const request = require('request')
const slug = require('slug')
const https = require("https");
const req = require('request-promise')
const db = require("./db")
const {handleExtraJson, sleep} = require('../utils/fileData')
const {tl} = require('../utils/locale')
const mdbUri = 'https://api.themoviedb.org/3'
const imgHost = 'https://image.tmdb.org'
const mdbImgUrl = `${imgHost}/t/p/w500/`
const {APP_COMMON_CONF} = require('../constant/common')
const assert = require('http-assert')
const {validJson} = require('../utils/basicHelpers')

const makeReq = async (options) => {

  if (!options) return false

  const { method, query, data, jsonParse, uri, sync, mdbRelated, locale } = options
  const methods = ['GET', 'POST', 'PUT', 'DEL']
  const methodUp = method.toUpperCase()

  if (!uri) return false
  if (!method.includes(methodUp)) return false

  const {proxy, tmdbKey = ''} = await handleExtraJson()

  if (mdbRelated) {
    assert(tmdbKey, tl({locale, key: 'tmdbKeyMissing'}))
  }
  const proxiedRequest = req.defaults({ proxy: proxy || null })
  const isGet = (methodUp === 'GET')
  const opts = {
    method: method,
    uri,
    json: jsonParse === false ? false : true,
  }

  if (mdbRelated) {
    opts.uri = mdbUri + uri
    if (!opts.agent) {
      opts.agent =  new https.Agent({});
    }
    console.log(`opts.agent `, opts.agent)
    opts.agent.rejectUnauthorized = false
  }

  if (isGet) {
    opts['qs'] = {}
    mdbRelated && (opts.qs.api_key = tmdbKey)

    if (query) {
      opts.qs = Object.assign(opts.qs, query)
    }
  }
  if (!isGet && data) {
    opts['body'] = data
    mdbRelated && (opts['body'].api_key = tmdbKey)
  }
  if (sync) {
    const result = {
      err: null,
      data: null,
    }
    try {
      result.data = await proxiedRequest(opts)
    }
    catch (err) {
      assert(false, err)
    }
    return result
  }
  return proxiedRequest(opts)
}


function videoResPath () {
  const {mediaDir} = require('../utils/fileData').altAssetsDir()
  const bDir = mediaDir || path.join(__dirname, '../medias')
  const tmpPath = path.join(bDir, 'tmp')
  return {
    coverTmpPath: path.join(tmpPath, 'covers'),
    creditTmpPath: path.join(tmpPath, 'credits'),
    coverDestPath: path.join(bDir, 'covers'),
    creditDestPath: path.join(bDir, 'credits'),
  }
}
const downloadFile = async (params, callback) => {
  const {
    filename, type, fileExt = 'jpg', mdbItemPath, fileUrl,
    onDone
  } = params
  const fileTypes = [
    {
      type: 'cover',
      dirPath: videoResPath().coverDestPath,
    },
    {
      type: 'credit',
      dirPath: videoResPath().creditDestPath,
    },
  ]
  const res = {
    didGet: false,
    err: '',
    originalErr: null,
    filename,
  }
  const fileType = fileTypes.find(typeItem => typeItem.type === type)
  const createIfNotFoundDir = async (path) => {
    if (!fs.existsSync(path)) {
      fsExtra.mkdirpSync(path)
    }
  }
  const gotFile = (fPath) => fs.existsSync(fPath)
  const onFinished = () => {
    onDone && onDone(res)
  }
  console.log(`downloadFile fileType ${fileType} `)
  if (fileType) {
    const {dirPath} = fileType
    await createIfNotFoundDir(dirPath)
    const tFileName = filename + '.' + fileExt
    const filePath = path.join(dirPath, tFileName)
    const tmpFilePath = path.join(dirPath, tFileName + '.tmp')
    const alreadyGot = gotFile(filePath)

    alreadyGot && onFinished(res)
    if (!alreadyGot) {
      if (gotFile(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath, err => null)
      }

      const downloadUrl = fileUrl || (mdbItemPath && mdbImgUrl + mdbItemPath) || null

      if (downloadUrl) {
        request.head(downloadUrl, (err, res, body) => {
          if (err) {
            console.warn('request.head(downloadUrl WARN ', err)
            res.err = err.toString()
            res.originalErr = err
            return onFinished
          }
          request(downloadUrl).pipe(fs.createWriteStream(tmpFilePath)).on('close', () => {
            console.log(`downloadUrl ${downloadUrl} ===================  `)
            fs.renameSync(tmpFilePath, filePath)
            res.didGet = true
            res.filePath = filePath
            onFinished()
          })
        })
      }
    }
  }
}

const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}

const clearDir = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath)
    if (files.length) {
      files.forEach(fItem => {
        const fPath = path.join(dirPath, fItem)
        fs.unlinkSync(fPath)
      })
    }
  }
  return true
}

const fixTmdbImgUrl = (params) => {
  const {videos = [], artists = []} = params || {}
  const serverPath = APP_COMMON_CONF.serverConf && APP_COMMON_CONF.serverConf.server && `http://${APP_COMMON_CONF.serverConf.server.host}:${APP_COMMON_CONF.serverConf.server.port}`
  const hostMediaPath = serverPath && (serverPath + '/medias')
  const assignUrl = ({id, originalPath, imgType = 'covers'}) => {
    console.log(`fixTmdbImgUrl APP_COMMON_CONF.serverConf ${JSON.stringify(APP_COMMON_CONF.serverConf)}`)
    const rUrl = (id && hostMediaPath) ? `${hostMediaPath}/${imgType}/${id}.jpg` : (originalPath && `${mdbImgUrl}${originalPath}`)

    return rUrl
  }

  for (const v of videos) {
    const dObj = typeof v.detail === 'object' ? v.detail : (v.detail && validJson(v.detail) && JSON.parse(v.detail))
    const originalPath = dObj && dObj.poster_path || v.poster_path || null
    v.coverUrl = assignUrl({id: v.cover, originalPath})

    if (!v.coverUrl) {
      v.coverUrl = hostMediaPath ? `${hostMediaPath}/img/noimage.png` : null
    }
  }
  for (const a of artists) {
    a.avatarUrl = assignUrl({id: a.avatar, originalPath: a.profile_path, imgType: 'credits'})
    if (!a.avatarUrl) {
      a.avatarUrl = hostMediaPath ? `${hostMediaPath}/img/noimage.png` : null
    }
  }
}

exports.makeReq = makeReq
exports.downloadFile = downloadFile
exports.deepClone = deepClone
exports.sleep = sleep
exports.fixTmdbImgUrl = fixTmdbImgUrl
