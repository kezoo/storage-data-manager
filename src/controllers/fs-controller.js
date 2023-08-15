const path = require('path')
const fs = require('fs')
const assert = require('http-assert')
const db = require("../lib/db")
const fsExtra = require('fs-extra')
const {chunk} = require('../utils/basicHelpers')
const {tl} = require('../utils/locale')
const {handleExtraJson, escapeRegExp, sleep} = require('../utils/fileData')

async function scanDir (ctx) {
  const res = await scanDirFn({params: ctx.request.body})
  ctx.body = res
}
async function handlePathAndCategory (params) {
  const {
    skipDriveLetter, pathAndCategory, skipPathForPathAndCategory, ctx, paramsObj,
    onGetDrives, onDone,
    onStartOuterLoop, onEndOuterLoop,
    onStartInnerLoop, onEndInnerLoop,
    onListenMsg,
  } = params || {}
  const locale = paramsObj.locale
  const toSkipDriveLetters = (skipDriveLetter || []).split(' ')
  const drivesRes = await getDrives(ctx, {bypassBody: true})
  const validDrives = drivesRes.drives.filter(dItem => !toSkipDriveLetters.includes(dItem.driveLetter.toLowerCase()))

  console.log(`toSkipDriveLetters ${toSkipDriveLetters.join(' ')} drives : `, validDrives)

  onGetDrives && onGetDrives({payload: {drives: validDrives}})

  let doCloseWs = false
  onListenMsg && onListenMsg({
    onCloseWs: () => {
      doCloseWs = true
      console.log(`onCloseWs ---------------------------`)
    }
  })

  for (const driveItem of validDrives) {
    if (doCloseWs) {
      console.log('exit outer loop due to wsClosing');
      break;
    }

    // scanDirFn
    const {driveLetter, driveLabel} = driveItem
    const paths = pathAndCategory.map(oItem => path.join(driveLetter + ':', path.normalize(oItem.path)))

    onStartOuterLoop && onStartOuterLoop({
      payload: {
        driveItem,
        paths,
      }
    })

    for (let j = 0; j < pathAndCategory.length; j++) {
      if (doCloseWs) {
        console.log('exit inner loop due to wsClosing');
        break;
      }

      const oItem = pathAndCategory[j]
      const oPath = path.normalize(oItem.path)
      const fPath = path.join(driveLetter + ':', oPath)
      let isPathValid = fs.existsSync(fPath) && fs.lstatSync(fPath).isDirectory()
      let invalidReason = isPathValid ? '' : tl({locale, key: 'invalidPath'})

      if (isPathValid) {
        const doExclude = skipPathForPathAndCategory.find(aItem => path.normalize(aItem.value).toLowerCase() === fPath.toLowerCase())
        if (doExclude) {
          isPathValid = false
          invalidReason = tl({locale, key: 'userSkipped'})
        }
      }

      const innerLoopParams = {
        invalidReason,
        innerIndex: j,
        path: fPath,
        driveItem,
      }
      onStartInnerLoop && onStartInnerLoop({
        payload: {
          startInnerLoop: isPathValid,
          ...innerLoopParams,
        }
      })
      let countNewItems= 0
      if (isPathValid) {
        console.log(`fPath ${fPath} ${isPathValid ? "✓" : "X"}`, )
        // await sleep(1000)
        const sRes = await scanDirFn({
          params: {
            dirPath: fPath,
            skipDirPathChecking: true,
            catId: oItem.categoryId,
            subCatId: oItem.subCategoryId,
            driveLabel,
            locale,
          }
        })
        if (sRes && sRes.countNewItems) {
          countNewItems = sRes.countNewItems
        }
      }

      onEndInnerLoop && onEndInnerLoop({
        payload: {
          endInnerLoop: true,
          countNewItems,
          ...innerLoopParams,
        }
      })
    }

    onEndOuterLoop && onEndOuterLoop({
      payload: {
        endOuterLoop: true, driveItem,
      }
    })
  }
  onDone && onDone({payload: {isDone: true}})
}
async function handleWsPathAndCategory (params) {
  const {ws, req, onListenMsg, paramsObj} = params
  const {pathAndCategory = [], skipDriveLetter = '', skipPathForPathAndCategory = []} = await handleExtraJson()
  const MSG_TYPES = {
    getDrives: {
      name: 'GET_DRIVES',
    },
    startOuterLoop: {
      name: 'START_OUTER_LOOP',
    },
    endOuterLoop: {
      name: 'END_OUTER_LOOP',
    },
    startInnerLoop: {
      name: 'START_INNER_LOOP',
    },
    endInnerLoop: {
      name: 'END_INNER_LOOP',
    },
    done: {
      name: 'DONE',
    },
  }

  await handlePathAndCategory({
    pathAndCategory, skipDriveLetter, skipPathForPathAndCategory,
    ctx: null,
    onListenMsg, paramsObj,
    onGetDrives: ({payload}) => {
      ws.send(JSON.stringify({
        msgType: MSG_TYPES.getDrives.name, ...payload,
      }))
    },
    onStartOuterLoop: ({payload}) => {
      ws.send(JSON.stringify({
        msgType: MSG_TYPES.startOuterLoop.name,
        ...payload,
      }))
    },
    onStartInnerLoop: ({payload}) => {
      ws.send(JSON.stringify({
        msgType: MSG_TYPES.startInnerLoop.name, ...payload,
      }))
    },
    onEndInnerLoop: ({payload}) => {
      ws.send(JSON.stringify({
        msgType: MSG_TYPES.endInnerLoop.name, ...payload,
      }))
    },
    onEndOuterLoop: ({payload}) => {
      ws.send(JSON.stringify({
        msgType: MSG_TYPES.endOuterLoop.name, ...payload,
      }))
    },
    onDone: ({payload}) => {
      ws.send(JSON.stringify({
        msgType: MSG_TYPES.done.name, ...payload,
      }))
    },
  })
  console.log(`handleWsPathAndCategory `, pathAndCategory, skipDriveLetter)
}
async function scanDirFn ({params}) {
  const { dirPath, skipDirPathChecking, catId, subCatId, driveLabel, locale } = params
  const tCatId = Number(catId)
  const validCatId = (Number.isInteger(tCatId) && tCatId > 0) ? tCatId : null
  const tSubCatId = Number(subCatId)
  const validSubCatId = (Number.isInteger(tSubCatId) && tSubCatId > 0) ? tSubCatId : null
  console.log(`scanDirFn `)
  const validDirPath = skipDirPathChecking || (typeof dirPath === 'string' && fs.existsSync(path.normalize(dirPath)))
  const validDriveLabel = (typeof driveLabel === 'string' && driveLabel.trim() !== '') ? driveLabel : ''
  console.log(`scanDirFn validDirPath ${validDirPath}   -  ${dirPath}`)
  assert(validDirPath, tl({locale, key: 'invalidDirPath'}))

  if (validDriveLabel) {
    await handleExtraJson({labelName: validDriveLabel})
  }

  const {potentialDup, clearDataBeforeAdding, keepThoseWatchedVideos} = await handleExtraJson()
  const doOverride = potentialDup === 'override'
  const rootPath = path.normalize(dirPath)
  const files = await readDirSync({dirPath: rootPath})
  const filesToInsert = []
  const res = {
    countNewItems: 0, dupItems: [], countFound: files.length
  }
  console.log(`scanDirFn --------- validCatId ${validCatId} validSubCatId ${validSubCatId} validDriveLabel ${validDriveLabel} clearDataBeforeAdding ${clearDataBeforeAdding} keepThoseWatchedVideos ${keepThoseWatchedVideos} filesLen `, files.length)

  const findWatchedItems = []
  if (clearDataBeforeAdding && keepThoseWatchedVideos) {
    const fBuilder = db('files')
      .where('drive_label', validDriveLabel)
      .leftJoin('watch_video', 'watch_video.file_id', 'files.id')
      .where({'watch_video.watch': 1})

    const findWatchedList = await fBuilder.clone()
    const notExistedWatched = []

    for (const wItem of findWatchedList) {
      const findWatched = files.find(fItem => fItem.name === wItem.name && fItem.original_size === wItem.original_size && fItem.type === wItem.type)

      if (findWatched) {
        findWatchedItems.push(findWatched)
      }
      else {
        notExistedWatched.push(wItem)
        console.warn(`Watched item, but no longer exists - ${wItem.name}`)
      }
    }

    const notExistedWatchedIds = notExistedWatched.map(fItem => fItem.file_id)
    console.log(`findWatched ################    `, findWatchedList.length, findWatchedItems.length,  notExistedWatchedIds)

    if (notExistedWatchedIds.length) {
      await delFilesRelated({fileIds: notExistedWatchedIds})
    }
  }

  const findRelatedVideoItems = await db('files')
    .where('files.drive_label', validDriveLabel)
    .leftJoin('file_video', 'file_video.file_id', 'files.id')
    .whereNotNull('file_video.video_id')
    .select(['files.*', 'file_video.file_id', 'file_video.video_id'])

  console.log(`findRelatedVideoItems `, findRelatedVideoItems.length)

  for (const file of files) {
    const shouldOmitWatched = findWatchedItems.find(fW => fW.name.toLowerCase() === file.name.toLowerCase())
    if (shouldOmitWatched) {
      console.log(`shouldOmitWatched --------- `, shouldOmitWatched.name)
      continue
    }
    if (driveLabel) {
      Object.assign(file, {drive_label: driveLabel})
    }

    const dupItem = await gotSimilarItem({name: file.name, original_size: file.original_size, type: file.type})

    if (dupItem && doOverride && !clearDataBeforeAdding) {
      res.dupItems.push({...file, oItem: dupItem})
      const needChangeCatId = doChangePropFn({valA: validCatId, valB: dupItem.cat_id})
      const needChangeSubCatId = doChangePropFn({valA: validSubCatId, valB: dupItem.sub_cat_id})

      // console.log(`DUP CHECK::::::`, needChangeCatId, needChangeSubCatId)

      if (needChangeCatId || needChangeSubCatId) {
        const cInfo = {cat_id: validCatId, sub_cat_id: validSubCatId}
        if (!validCatId && dupItem.file_id) {
          await db('file_category').where({file_id: dupItem.file_id}).del()
        }
        if (validCatId) {
          if (dupItem.file_id) {
            await db('file_category').where({file_id: dupItem.file_id}).update(cInfo)
          }
          else {
            await db('file_category').insert({...cInfo, file_id: dupItem.id})
          }
        }
      }

      await db('files').where({id: dupItem.id}).update({...file, updated_at: new Date().toISOString()})

      continue
    }
    filesToInsert.push(file)
  }
  if (clearDataBeforeAdding) {
    const sel = ['files.*']
    const fBuilder = db('files').where('drive_label', validDriveLabel)
    if (keepThoseWatchedVideos) {
      fBuilder.whereNotExists(function (aBuilder) {
        aBuilder.select('*')
        .from('watch_video')
        .whereRaw('watch_video.file_id = files.id');
      })
      .orWhereExists(function (aBuilder) {
        aBuilder.select('*')
        .from('watch_video')
        .whereRaw('watch_video.file_id = files.id')
        .whereNotIn('watch_video.watch', [1])
      })
    }

    if (validCatId || validSubCatId) {
      fBuilder.join('file_category', function (qB) {
        qB.on('file_category.file_id', '=', 'files.id')

        if (validCatId) {
          qB.on('file_category.cat_id', '=', validCatId)
        }
        if (validSubCatId) {
          qB.on('file_category.sub_cat_id', '=', validSubCatId)
        }
      })
    }
    try {
      const fRaw = await fBuilder.clone()
      const fileIds = fRaw.map(fItem => fItem.id)
      // await fBuilder.clone().del()
      await delFilesRelated({fileIds})
      console.log(`clearDataBeforeAdding LIST `, fileIds.length, `\nDEL_IDS ${JSON.stringify(fileIds)}`)
    }
    catch (err) {
      console.log(`clearDataBeforeAdding err `, err)
    }

  }
  const fLen = res.countNewItems = filesToInsert.length
  console.log(`filesToInsert LEN `, filesToInsert.length)
  if (fLen) {
    const listChunk = chunk({list: filesToInsert, chunkSize: 30})
    // console.log(`listChunk `, listChunk)
    for (const tChunk of listChunk) {
      const chunkLen = tChunk.length
      await db('files').insert(tChunk, 'id').then(async function (rData) {

        const rId = Array.isArray(rData) && rData[0]
        console.log(`DriveLabel ${validDriveLabel} rId ${rId} `, Number.isInteger(rId))
        if (Number.isInteger(rId)) {
          const ids = Array(chunkLen).fill(0).map((num, idx) => rId - idx)
          // console.log(`DriveLabel ${validDriveLabel} idsLength ${ids.length}`)
          const fileVideoItems = []

          if (findRelatedVideoItems.length) {
            const idsRevert = ids.reverse()
            for (let n = 0; n < idsRevert.length; n++) {
              const fileItem = tChunk[n]
              const fileId = idsRevert[n]
              const findSimilarItem =  findRelatedVideoItems.find(fVItem => fVItem.name === fileItem.name && fVItem.original_size === fileItem.original_size && fVItem.type === fileItem.type)

              if (findSimilarItem) {
                fileVideoItems.push({
                  file_id: fileId,
                  video_id: findSimilarItem.video_id,
                })
              }
              // console.log(`fileItem fileId ${fileId} ${JSON.stringify(fileItem)}    findSimilarItem `, findSimilarItem)
            }
          }

          if (fileVideoItems.length) {
            await db('file_video').insert(fileVideoItems)
          }

          if (validCatId) {
            const vList = ids.map(fId => {
              const vItem = {file_id: fId, cat_id: validCatId}
              if (validSubCatId) {
                Object.assign(vItem, {sub_cat_id: validSubCatId})
              }
              return vItem
            })
            try {
              await db('file_category').insert(vList)
            }
            catch (err) {
              console.error(`ERROR when batchInsert file_category.........`)
            }
            // console.log(`DriveLabel ${validDriveLabel} vList ${vList.length}`)
          }
        }
      })
    }
  }
  return res
}
async function delFilesRelated ({fileIds, doDelFiles}) {
  if (doDelFiles) {
    await db('files').whereIn('files.id', fileIds).del()
  }
  await db('file_category').whereIn('file_category.file_id', fileIds).del()
  await db('watch_video').whereIn('watch_video.file_id', fileIds).del()
  await db('file_video').whereIn('file_video.file_id', fileIds).del()
}
async function readDirSync ({dirPath}) {
  let files = []
  let enableDeepScan = await isDeepScanFn({filepath: dirPath, passSymbolCheck: true})
  const fList = fs.readdirSync(dirPath, 'utf-8')
  const repList = await db('format_filename')
  const repListFn = (nameStr, isDir) => {
    if (!isDir) {
      const isDotFirstAndOnly = nameStr[0] === '.' && nameStr.match(/\./g).length === 1
      if (!isDotFirstAndOnly) {
        let nArr = nameStr.split('.')
        const nExt = nArr.pop()
        nameStr = nameStr.replace(`.${nExt}`, '')
      }
    }
    if (repList.length) {
      const rStr = repList.map(rItem => escapeRegExp(rItem.name)).join('|')
      const repReg = new RegExp(rStr, 'gi')
      return nameStr.replace(repReg, ' ').replace(/\s{2,}/g, ' ')
    }
    return nameStr
  }

  for (const file of fList) {
    const doSkip = await isFileExcluded({name: file})
    if (doSkip) {
      continue
    }
    const filepath = path.join(dirPath, file)
    const {bytes, fileType, isDir} = await getFolderSize({filepath})
    // console.log(`????????fullPath:${filepath}???????isDir:${isDir} bytes:${bytes}::::::::fileType:${fileType} --------- `,  readableSize)

    const fileProp = {
      filepath,
      original_size: bytes,
      type: fileType,
      name: repListFn(file, isDir),
      drive_label: '',
    }
    files.push(fileProp)

    if (isDir && enableDeepScan) {
      const nFiles = await readDirSync({dirPath: filepath})
      files = [...files, ...nFiles]
    }
    if (isDir && !enableDeepScan) {
      const shouldContinueScanThisFile = await isDeepScanFn({filepath, filename: file})
      if (shouldContinueScanThisFile) {
        const nFiles = await readDirSync({dirPath: filepath})
        files = [...files, ...nFiles]
      }
    }
  }

  return files
}
async function isDeepScanFn ({filepath, passSymbolCheck, filename}) {
  let isDeepScan = false
  if (!passSymbolCheck && filename) {
    const cSymbols = await db('collection_symbol').select(['name'])

    isDeepScan = cSymbols.some(item => {
      const reg = new RegExp(item.name, 'gi')
      return reg.test(filename)
    })
  }
  if (!isDeepScan) {
    const fDeepPath = await db('deepscan_path').first().whereRaw(`LOWER(name) = ?`, filepath.toLowerCase())

    if (fDeepPath) {
      isDeepScan = true
    }
  }
  return isDeepScan
}

async function getFolderSize ({filepath}) {
  let bytes = 0
  let hasErr = false
  let fileType = 'folder'
  let isDir = false
  try {
    const fStat = fs.lstatSync(filepath)

    if (fStat.isFile()) {

      bytes += fStat.size
      fileType = path.extname(filepath).substring(1).toUpperCase()
    }
    if (fStat.isDirectory()) {
      isDir = true
      const files = fs.readdirSync(filepath, 'utf-8')
      for (const file of files) {
        const fPath = path.join(filepath, file)
        bytes += (await getFolderSize({filepath: fPath})).bytes
      }
    }
  }
  catch (err) {
    console.error(`getFolderSize ERROR:::::: `, err)
    hasErr = true
  }
  return {bytes, hasErr, fileType, isDir}
}

async function isFileExcluded ({name}) {
  const findN = await db('file_exclusion').first().whereRaw('LOWER(name) = ?', name.toLowerCase())
  const bool = findN ? true : false

  return bool
}

async function gotSimilarItem ({name, original_size, type}) {
  const findItem = await db('files')
    .first()
    .whereRaw(`LOWER(name) = ?`, name.toLowerCase())
    .where({original_size, type})
    .leftJoin('file_category', 'file_category.file_id', 'files.id')


  if (findItem) {
    const categoryInfo = await db('file_category').first().where({file_id: findItem.id})
    if (categoryInfo) {
      Object.assign(findItem, categoryInfo)
    }
  }
  return findItem
}

function doChangePropFn ({valA, valB}) {
  return !!((!valA && valB) || (valA && !valB) || (valA !== valB))
}

async function getDrives (ctx, moreParams) {
  const {bypassBody} = moreParams || {}
  const res = {drives: []}
  const sysInfo = require('systeminformation')

  try {
    const drives = await sysInfo.blockDevices()
    for (const item of drives) {
      const nSize = Number(item.size)

      if (nSize > 0) {
        let driveLetter = item.mount || item.identifier
        driveLetter = driveLetter.replace(':', '')
        const info = {
          driveLetter,
          driveLabel: item.label,
          driveSize: nSize,
        }
        res.drives.push(info)
      }
    }
  }
  catch (err) {
    console.error(`GET DRIVES:::::::`, err)
  }
  if (bypassBody) {
    return res
  }
  ctx && (ctx.body = res)
}

async function getFolders (ctx) {
  const {dirpath} = ctx.query

  assert(fs.existsSync(dirpath), 'PATH DOES NOT EXIST')

  const res = {dirs: []}
  const excludeDirs = [
    '$RECYCLE.BIN', 'System Volume Information', 'Config.Msi',
    '$Hyper-V.tmp', '$SysReset', 'Documents and Settings',
    'found.000', 'PerfLogs', 'Program Files (x86)', 'ProgramData',
    'Recovery', 'Windows', 'Windows.old', 'Program Files',
  ]
  const fList = fs.readdirSync(dirpath, 'utf-8')
  for (const file of fList) {
    const filepath = path.join(dirpath, file)
    try {
      const isPathDir = fs.statSync(filepath).isDirectory()
      if (isPathDir && !excludeDirs.includes(file)) {
        res.dirs.push({'file': file, 'filepath': filepath})
      }
    }
    catch (err) {

    }
}
  ctx.body = res
}
async function clearElectronCache (ctx) {
  const {doClear, doReload} = ctx.query
  const {BrowserWindow} = require('electron')
  if (BrowserWindow) {
    const mWin = BrowserWindow.getFocusedWindow()
    if (doClear) {
      mWin.webContents.session.clearCache()
      await sleep(3000)
    }
    if (doReload) {
      mWin.webContents.reloadIgnoringCache()
    }
  }
  ctx.body = {}
}
module.exports = {
  scanDir, getDrives, getFolders, clearElectronCache, handlePathAndCategory,
  handleWsPathAndCategory,
}
