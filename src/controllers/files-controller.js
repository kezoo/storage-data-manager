
const humps = require("humps")
const db = require("../lib/db")
const { makeReq, fixTmdbImgUrl } = require('../lib/requests')
const assert = require('http-assert')
const {removeInvalidKeys, cloneObj, byteLength, chunk, cleanFileName, objectPickKeys, objectOmitKeys, validJson} = require('../utils/basicHelpers')
const {fileSize} = require('../utils/basicHelpers')
const {tl} = require('../utils/locale')
const {getDataType, sleep, downloadMissingImages} = require('../utils/fileData')
const mediaUris = {
  movie: '/movie',
  tv: '/tv',
}

module.exports = {
  async searchFiles (ctx) {
    const {wHistory, watchHistory, watchlist, wList, offset, limit, wholeWord, driveLabel, query: sText, catId, subCatId, sortBy, reverseOrder, locale} = ctx.query
    const query = {}
    const pHistory = Number(wHistory) || Number(watchHistory)
    const pList = Number(wList) || Number(watchlist)
    const withoutWatchingRef = !pHistory && !pList
    const builder = db('files')
    const wLevel1 = 2
    const wLevel2 = 3
    const wLevel3 = 4
    const watchIn = []
    const searchWholeWord = Number(wholeWord) === 1 ? true : false
    const doReverse = Number(reverseOrder) === 1
    const sorts = {
      filename: {
        sort: `LOWER(files.name)`
      },
      filesize: {
        sort: `files.original_size`
      },
      driveLabel: {
        sort: `LOWER(files.drive_label)`
      },
      filetype: {
        sort: `LOWER(files.type)`
      },
      newest: {
        sort: `files.created_at`
      }
    }
    const requireDescFirst = ['newest'].includes(sortBy)
    const orderStr = doReverse ? (requireDescFirst ? 'ASC' : 'DESC') : (requireDescFirst ? 'DESC' : 'ASC')
    const sortObj = sorts[sortBy] || sorts['filename']

    if (pHistory) {
      Object.assign(query, {'watch_video.watch': 1})
    }
    if (!pHistory && pList) {
      watchIn.push(wLevel1, wLevel2, wLevel3)
    }
    if (driveLabel && withoutWatchingRef) {
      Object.assign(query, {drive_label: driveLabel})
    }
    if (Number.isInteger(Number(catId))) {
      Object.assign(query, {'file_category.cat_id': Number(catId)})
    }
    if (Number.isInteger(Number(subCatId)) && Number(subCatId) > 0) {
      Object.assign(query, {'file_category.sub_cat_id': Number(subCatId)})
    }
    const hasQuery = Object.keys(query).length > 0
    if (hasQuery) {
      builder.where(query)
    }
    const doCheckList = watchIn.length > 0
    if (doCheckList) {
      builder.whereIn('watch_video.watch', watchIn)
    }

    if (sText) {
      const qLower = sText.toLowerCase()
      if (searchWholeWord) {
        const reg = new RegExp(`\b${qLower}\b`, 'gi')
        builder.where(function (qBuilder) {
          qBuilder
            .where(`files.name`, 'like', `%${qLower} %`)
            // .orWhere(`files.name`, 'like', `% ${qLower}%`)
            .orWhere(`files.name`, 'like', `% ${qLower} %`)
            .orWhereRaw(`LOWER(files.name) = ?`, `${qLower}`)
        })
      }
      else {
        builder.whereRaw(`LOWER(files.name) LIKE '%' || LOWER(?) || '%'`,  qLower)
      }
    }
    const groupIds = ['videos.id']
    builder.leftJoin('file_category', 'file_category.file_id', 'files.id')
    builder.leftJoin('category', 'category.id', 'file_category.cat_id')
    builder.leftJoin('sub_category', 'sub_category.id', 'file_category.sub_cat_id')
    builder.leftJoin('watch_video', 'watch_video.file_id', 'files.id')

    const [{'count(*)': count}] = await builder.clone().count()
    let sortL = [`${sortObj.sort} ${orderStr}`]

    if (doCheckList) {
      sortL.unshift('watch DESC')
    }
    const data = await builder
      .clone()
      .orderByRaw(sortL)
      .offset(offset)
      .limit(limit)
      .select([
        'files.id',
        'files.name',
        'files.drive_label',
        'files.original_size',
        'files.type',
        'files.filepath',
        'category.id as categoryId',
        'category.name as categoryName',
        'category.type as dataTypeId',
        'sub_category.name as subCategoryName',
        'sub_category.id as subCategoryId',
        'watch_video.watch as watch',
      ])
      // .groupBy(...groupIds)
    const pageInfo = {total: count, page: offset, limit}

    if (pageInfo.total) {
      pageInfo.totalPage = Math.ceil(pageInfo.total / limit)
    }
    ctx.state.doNotTrans = true

    for (const item of data) {
      if (item.watch === 1) {
        item.watched = 1
      }
      if (item.original_size) {
        item.readableSize = fileSize(item.original_size).human()
      }
      if (item.dataTypeId) {
        const fDataType = getDataType({locale, byId: item.dataTypeId}).findType
        if (fDataType) {
          item.dataType = fDataType.prop
          if (fDataType.extraAssign) {
            Object.assign(item, fDataType.extraAssign)
          }
        }
      }
      item.videos = await db('videos')
        .leftJoin('file_video', 'file_video.video_id', 'videos.mediaid')
        .where({file_id: item.id})
        .select(['videos.*'])

      fixTmdbImgUrl({videos: item.videos})
    }
    ctx.body = {pageInfo, files: data}
  },
  async search (ctx) {
    const vRes = await searchMatchVideo({ctx, queryParams: ctx.query})
    ctx.body = vRes
  },
  async post (ctx) {
    const { body } = ctx.request
    const res = await fileAttachVideoInfo({...body})
    ctx.body = res
  },

  async del (ctx) {
    const { body } = ctx.request
    const { videoId, fileId, locale } = body
    const toQ = {video_id: videoId, file_id: fileId}
    const findVideo = await db('file_video').first().where(toQ)
    assert(
      findVideo,
      `${tl({locale, key: 'noVideoWithThisMediaId'})} ` + videoId,
    )
    await db('file_video').where(toQ).del()
    ctx.body = { response: true }
  },

  async put (ctx) {
    const { watch, id, locale } = ctx.request.body
    const watchStatus = [0, 1, 2, 3, 4, 5, 6]
    const toUp = {}

    assert(Number.isInteger(id), tl({locale, key: 'invalidValue', rep: 'Id'}))
    const qId = {file_id: id}
    if (watchStatus.includes(watch)) {
      Object.assign(toUp, {watch})
    }
    if (Object.keys(toUp).length) {
      const fItem = await db('watch_video').first().where(qId)
      fItem ?
        await db('watch_video').where(qId).update(toUp) :
        await db('watch_video').insert({...qId, ...toUp})
    }
    ctx.body = {}
  },
  async fixFileVideoInfo (ctx) {
    await fixMissingVideoInfo({ctx})
    ctx.body = {}
  },
  async delFile (ctx) {
    const { ids } = ctx.request.body
    const validIds = Array.isArray(ids) ? ids.filter(id => Number.isInteger(id)) : []
    if (validIds.length) {
      const chunks = chunk({list: ids, chunkSize: 30})

      for (const chunkItem of chunks) {
        await db('file_category').whereIn('file_id', chunkItem).del()
        await db('watch_video').whereIn('file_id', chunkItem).del()
        await db('files').whereIn('id', chunkItem).del()
      }

    }
    ctx.body = {}
  },
  async upFiles (ctx) {
    const { ids, catId, subCatId, doChangeCategory, locale } = ctx.request.body
    let validIds = []
    if (ids) {
      validIds = Array.isArray(ids) ? ids.filter(id => Number.isInteger(id)) : []
    }
    const isCatIdValid = Number.isInteger(catId) && catId > 0
    const isSubCatIdValid = Number.isInteger(subCatId) && subCatId > 0

    if (isCatIdValid) {
      const toQuery = {'category.id': catId}
      isSubCatIdValid && Object.assign(toQuery, {'cat_subcat.sub_cat_id': subCatId})
      const categoryItem = await db('category').first().leftJoin('cat_subcat', 'cat_subcat.cat_id', 'category.id').where(toQuery)

      assert(categoryItem, tl({locale, key: 'cannotFindCategoryWithThisId'}))
    }

    if (doChangeCategory && validIds.length) {
      const chunks = chunk({list: ids, chunkSize: 30})

      for (const chunkItem of chunks) {
        await db('file_category').whereIn('file_id', chunkItem).del()
        if (isCatIdValid) {
          const toQuery = {cat_id: catId}
          isSubCatIdValid && Object.assign(toQuery, {sub_cat_id: subCatId})
          const newItems = chunkItem.map(cId => ({
            file_id: cId, ...toQuery
          }))
          await db('file_category').insert(newItems)
        }
      }
    }
    ctx.body = {}
  }
}

async function cleanFileData () {
  const files = await db('files').whereNotNull('videos')

  for (const f of files) {
    const fV = f.videos

    const vList = fV && fV.split(',')
    const validV = vList.filter(s => !isNaN(Number(s)))
    if (vList.length !== validV.length) {
      const tUp = {videos: validV.join(',')}
      await db('files').where({id: f.id}).update(tUp)
    }
  }
}

async function fixMissingVideoInfo ({ctx}) {
  const {filename, driveLabel, offset, limit} = ctx.query
  const builder = db('files')
  const q = {}

  driveLabel && Object.assign(q, {drive_label: driveLabel})

  if (filename) {
    builder.where('name', 'like', `%${filename}%`)
  }
  builder.where(q).where(function (mB) {
    mB.whereNull('videos')
    .orWhere('videos', '')
  })
  if (!driveLabel) {
    builder.limit(limit).offset(offset)
  }
  const files = await builder.orderByRaw(['created_at DESC'])

  function replaceName (strO) {
    return strO.replace(/\!|\'|,|\.|vs(\.)?/gi, '')
      .replace(/\d{1}:\s/gi, '')
      .replace(/-|:|_/gi, ' ')
      .replace(/\s{2,}/gi, ' ')
  }
  function matchYear (str) {
    let matches = str.match(/\d{4,}/gi)
    if (matches) {
      matches = matches.filter(n => n.length === 4 && Number(n) > 1899)
    }
    return matches
  }
  async function ckName ({fileInfo, vList, names, usedNames}) {
    const gotList = Array.isArray(vList) && vList.length > 0
    if (!gotList) {
      console.warn(`CANNOT FIND ANY MEDIAS...................`)
    }

    if (gotList) {
      const isOnlyResult = vList.length === 1
      for (let idx = 0; idx < vList.length; idx++) {
        const vInfo = vList[idx]
        const {mediaType, title, originalTitle, releaseDate, detail, name: tvName, originalName: oTvName, firstAirDate} = vInfo
        const isDetailObj = typeof detail === 'object'
        const validMediaType = ['movie', 'tv'].includes(mediaType)
        if (validMediaType) {
          const isTv = mediaType === 'tv'
          const doMatch = names.some(sItem => {
            const sItemName = sItem.key && sItem.key.toLowerCase()
            let nTitle = title || tvName
            nTitle = nTitle && nTitle.toLowerCase()
            let oTitle = originalTitle || oTvName
            oTitle = oTitle && oTitle.toLowerCase()
            let sameName = (sItemName === nTitle) || (sItemName === oTitle)
            let sYear = sItem.year

            if (!sYear && fileInfo.name) {
              const matchYears = matchYear(fileInfo.name)
              matchYears && (sYear = matchYears[matchYears.length - 1])
            }
            let rDate = releaseDate || firstAirDate || ''
            const blobSize = byteLength(sItemName)
            if (!rDate) {
              if (isDetailObj && detail.releaseDate) {
                rDate = detail.releaseDate
              }
            }

            if (!sameName) {
              const nThe = 'the '
              const nameStartWithThe = sItemName.indexOf(nThe) === 0
              if (nTitle) {
                const nTitleStartWithThe = nTitle.indexOf(nThe) === 0
                if (!nameStartWithThe && nTitleStartWithThe) {
                  sameName = sItemName === nTitle.substring(nThe.length)
                }
                if (!sameName && nameStartWithThe && !nTitleStartWithThe) {
                  sameName = sItemName.replace(nThe, '') === nTitle
                }
              }
            }

            if (!sameName) {
              if (nTitle) {
                sameName = sItemName === replaceName(nTitle)
              }
              if (!sameName && oTitle) {
                sameName = sItemName === replaceName(oTitle)
              }
            }

            let sameYear = false
            if (sYear && rDate) {
              sameYear = rDate.indexOf(sYear) >= 0
              if (!sameYear) {
                console.warn(`NOT EXACTLY SAME YEAR`)
                const vYear = Number(sYear)
                const yList = [vYear-1, vYear, vYear+1]
                const reg = new RegExp(yList.join('|'), 'gi')
                sameYear = reg.test(rDate)
                console.warn(`STILL NOT MATCH YEAR`, yList, rDate)
              }
            }
            else {
              console.warn(`CANNOT FIND YEAR`)
            }
            if (!sameYear && isTv && !sYear && sameName && blobSize > 10) {
              sameYear = true
            }

            if (sameName && !sameYear) {
              console.warn(`SAME NAME NOT SAME YEAR`)
            }
            // console.log(`\n????????:::::::\nsItemName:${sItemName}::::\nnTitle:${nTitle}::::\noTitle:${oTitle}::::\nsameName:${sameName}::::\nsYear:${sYear}::::\nsameYear:${sameYear}:::\nreleaseDate:${rDate}::::::::???`)
            return sameName && sameYear
          })
          if (doMatch) {
            console.info(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> DO HAVE A correspondence <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< \n${originalTitle || title}`)
            const {response} = await fileAttachVideoInfo({video: vInfo, file: fileInfo, ctx: null, ignoreAdded: true})
            break
          }
          if (!doMatch && names.length > 1 && usedNames.length < names.length) {
            const nextKey = names[usedNames.length].key
            // console.log(`USED NAMES:::::::::::::::::`, usedNames, ':::::::GOING TO CHECK NEXT TITLE KEY: ', nextKey)
            usedNames.push(nextKey)
            const queryParams = {...fileInfo, useTitle: nextKey}
            // console.log(`CONTINUE CHECK:::::::::queryParams: `, queryParams)
            const {realVideos} = await searchMatchVideo({queryParams})
            // console.log(`CONTINUE CHECK:::::::::videos: `, realVideos.length, JSON.stringify(realVideos))
            await ckName({fileInfo, vList: humps.camelizeKeys(realVideos), names, usedNames})
          }
        }
      }
    }
  }
  for (const [index, nFile] of files.entries()) {
    // console.log(`${index} / ${files.length} fixMissingVideoInfo0 nFile: `, JSON.stringify(nFile))
    const fileInfo = {}
    // console.log(`fixMissingVideoInfo0 fileInfo: `, JSON.stringify(fileInfo))
    if (fileInfo.err) {
      console.error('ERROR ON FILE MATCH VIDEO::::::::::::::', fileInfo.err)
      break
    }
    const vInfoRes = fileInfo.data.data.videos
    const vList = vInfoRes.results || vInfoRes
    const names = fileInfo.data.names_decoded
    const usedNames = []
    usedNames.push(names[0].key)
    await ckName({vList, names, usedNames, fileInfo: nFile})
  }
}


async function grabVideoDetail (params) {
  const {mediaid, mUri, locale} = params

  if (mediaid) {
    const fVideo = await db('videos').first().where({mediaid})
    if (fVideo) {
      const videoDetail = await makeReq({
        method: 'GET',
        uri: `${mUri}/${mediaid}`,
        mdbRelated: true,
        query: {language: locale},
        sync: true,
      })
      if (videoDetail && videoDetail.data) {
        await db('videos').where({mediaid}).update({detail: JSON.stringify(videoDetail.data)})
      }
    }
  }
}
async function grabVideoCredits (params) {
  const {mediaid, mUri, locale} = params
  const creditListCleaned = []
  if (mediaid) {
    const fVideo = await db('videos').first().where({mediaid})
    if (fVideo) {
      const credits = await makeReq({
        method: 'GET',
        uri: `${mUri}/${mediaid}/credits`,
        query: {language: locale},
        mdbRelated: true,
        sync: true,
      })
      if (credits && credits.data) {
        const creditList = [...credits.data.crew, ...credits.data.cast]

        const artists = []
        const pickKeys = ['name', 'original_name', 'popularity', 'gender', 'known_for_department', 'department', 'job', 'profile_path', 'credit_id']
        creditList.forEach(item => {
          const findA = artists.find(aItem => aItem.id === item.id)
          if (!findA) {
            artists.push({
              id: item.id,
              name: item.name,
              original_name: item.original_name,
              profile_path: item.profile_path,
            })
          }
          creditListCleaned.push({
            ...objectPickKeys(item, pickKeys),
            artist_id: item.id,
            video_id: Number(mediaid),
            adult: item.adult ? 1 : 0,
            extra: JSON.stringify(objectOmitKeys(item, [...pickKeys, 'id', 'adult'])),
          })
        })
        console.log(`creditsData artists ${artists.length} `)
        console.log(`creditsData creditList ${creditList.length}`)
        const creditChunk = chunk({list: creditListCleaned, chunkSize: 30})
        for (const tChunk of creditChunk) {
          const {newList} = await filterBeforeInsert({
            list: tChunk,
            idProp: 'video_id',
            dbName: 'cast',
            idColumnName: 'video_id',
            propsToCheck: ['video_id', 'artist_id', 'credit_id']
          })
          newList.length && (await db('cast').insert(newList, 'id'))
        }

        const artistsChunk = chunk({list: artists, chunkSize: 30})
        for (const tChunk of artistsChunk) {
          const {newList} = await filterBeforeInsert({
            list: tChunk,
            dbName: 'video_artist',
            propsToCheck: ['id']
          })
          newList.length && (await db('video_artist').insert(newList, 'id'))
        }
      }
    }
  }
  const res = {list: creditListCleaned}
  return res
}
async function filterBeforeInsert (params) {
  const {list = [], id, idProp = 'id', dbName, idColumnName = 'id', propsToCheck} = params || {}
  const idsToCheck = Array.from(new Set(
    list.map(item => {
      if (typeof item === 'string' || typeof item === 'number') return item
      if (typeof item === 'object') return item[idProp]
      return ''
    })
  ))
  id && idsToCheck.push(id)
  console.log(`idsToCheck ${idsToCheck.length}`)
  const findExistingItems = await db(dbName).whereIn(idColumnName, idsToCheck)
  console.log(`filterBeforeInsert findExistingItems ${findExistingItems.length}`)
  const filterNotExist = list.filter(cItem => {
    const findIt = findExistingItems.find(fItem => {
      let doFind = false
      if (propsToCheck) {
        let countOkay = 0
        for (const aProp of propsToCheck) {
          const doHave = fItem[aProp] === cItem[aProp]
          // console.log(`filterBeforeInsert doHave ${doHave} countOkay ${countOkay} aProp ${aProp} `, fItem[aProp], typeof fItem[aProp], cItem[aProp], typeof cItem[aProp])
          if (doHave) countOkay++;
        }
        if (countOkay === propsToCheck.length) {
          doFind = true;
        }
        // console.log(`filterBeforeInsert ${countOkay} doFind ${doFind}`)
      }
      else {
        doFind = fItem === cItem
      }
      return doFind
    })
    return !findIt
  })
  console.log(`filterBeforeInsert newList ${filterNotExist.length}`)
  const res = {newList: filterNotExist}
  return res
}
async function requestVideoInfo (params) {
  const {mediaid} = params
}
async function fileAttachVideoInfo (params) {
  const {video, fileId, locale} = params || {}
  const {id, mediaType, title, originalTitle, originalName, name} = video || {}

  assert(Number.isInteger(Number(fileId)), tl({locale, key: 'invalidValue', rep: 'fileId'}))
  assert(Number.isInteger(id), tl({locale, key: 'invalidValue', rep: 'Id'}))

  const findFile = await db('files').first().where({id: fileId})
  assert(findFile, tl({locale, key: 'noThisFile'}))

  let findVideo = await db('videos').first().where({mediaid: id})

  if (!findVideo) {
    const insertVideo = {}
    const isFilm = (mediaType === 'movie')
    const tTitle = isFilm ? title : (name || '')
    const tOriginalTitle = isFilm ? originalTitle : (originalName || '')

    insertVideo.mediaid = id
    insertVideo.media_type = mediaType
    insertVideo.title = tTitle
    insertVideo.original_title = tOriginalTitle
    await db('videos').insert(humps.decamelizeKeys(insertVideo))
    findVideo = insertVideo
  }

  let findFileVideo = await db('file_video').first().where({file_id: fileId, video_id: id})
  if (findVideo) {
    const mUri = mediaUris[findVideo.media_type]
    if (!findVideo.detail) {
      await grabVideoDetail({mediaid: id, mUri, locale})
    }
    /* if (!findVideo.credits) {
      await grabVideoCredits({mediaid: id, mUri, locale})
    } */
  }
  findFileVideo && assert(false, tl({locale, key: 'alreadyAdded'}))
  if (!findFileVideo) {
    await db('file_video').insert({file_id: fileId, video_id: id})
  }
  if (!findVideo.detail) {
    findVideo = await db('videos').first().where({mediaid: id})
  }
  if (findVideo) {
    fixTmdbImgUrl({videos: [findVideo]})
  }
  return {response: findVideo}
}

async function searchMatchVideo ({queryParams, ctx}) {
  const { id, useTitle, doAddIfNone, page, reSearch: rS, locale} = queryParams

  assert(
    Number.isInteger(Number(id)),
    tl({locale, key: 'invalidValue', rep: 'Id'}),
  )
  const nId = Number(id)
  const findTheFile = await db('files').first().where({id: nId})
  assert(
    findTheFile,
    tl({locale, key: 'noThisFile'}),
  )
  const {name} = findTheFile
  const reSearch = rS && Number(rS) > 0

  let title = name
  const availableNames = useTitle ? [] : cleanFileName(title)
  const titleToQuery = availableNames[0] || useTitle || title
  const otherResData = {
    page: 1, totalPages: 1, query: availableNames.map(strName => ({title: strName})), currentQuery: titleToQuery
  }

  let videos = await db('file_video')
    .where({file_id: nId})
    .leftJoin('videos', 'videos.mediaid', 'file_video.video_id')
    .select([
      'videos.*', 'file_video.file_id as fileId'
    ])
  const gotVideoIds = videos.map(vItem => vItem.mediaid)
  const hasDbAssociation = gotVideoIds.length > 0

  if (reSearch || !videos.length) {
    let qData = {
      query: titleToQuery,
      include_adult: true,
      language: locale,
    }
    if (page) {
      qData.page = page
    }
    const options = {
      method: 'GET',
      uri: '/search/multi',
      query: qData,
      mdbRelated: true,
      sync: true,
      ctx,
    }
    const queryVideos = await makeReq(options)
    // console.log(`RESULT FOR MULTI::::::::::::`, JSON.stringify(queryVideos))
    if (queryVideos.data) {
      let rVideos = queryVideos.data.results
      const {page, total_pages} = queryVideos.data
      page && Object.assign(otherResData, {page})
      total_pages && Object.assign(otherResData, {totalPages: total_pages})

      if (rVideos && gotVideoIds.length) {
        rVideos = rVideos.filter(vItem => !gotVideoIds.includes(vItem.id + ''))
      }
      videos.push(...rVideos)
    }
  }

  for (const vItem of videos) {
    vItem.videoOrder = 0
    if (vItem.detail) {
      vItem.detail = JSON.parse(vItem.detail)
      vItem.videoOrder += 1
    }
    if (vItem.fileId) {
      vItem.videoOrder += 1
    }
    if (!vItem.grabbed_cast) {
      const toParams = {
        mediaid: vItem.mediaid,
        mUri: mediaUris[vItem.media_type],
        locale,
      }
      try {
        const {list} = await grabVideoCredits(toParams)
        vItem.cast = list
      }
      catch (err) {
        console.error(err)
      }
      if (vItem.mediaid && gotVideoIds.includes(vItem.mediaid)) {
        await db('videos').where({mediaid: vItem.mediaid}).update({grabbed_cast: 1})
      }
    }
    else {
      // console.log(`Request vItem `, vItem)
      const mId = vItem.mediaid || vItem.id
      if (mId) {
        vItem.cast = await db('cast')
          .where('cast.video_id', mId)
          .leftJoin('video_artist', 'video_artist.id', 'cast.artist_id')
          .select(['cast.*', 'video_artist.avatar', 'video_artist.profile_path'])
      }
    }
    if (vItem.mediaid && !vItem.cover) {
      const artists = (vItem.cast || []).map(castItem => ({
        id: castItem.artist_id,
        avatar: castItem.avatar,
        profile_path: castItem.profile_path,
      }))
      const artistsUnique = []
      for (const a of artists) {
        const findA = artistsUnique.find(aItem => aItem.id === a.id)
        if (!findA) {artistsUnique.push(a)}
      }
      // console.log(`artists `, artistsUnique)
      downloadMissingImages({videos: [vItem], artists: artistsUnique})
    }

    if (vItem.cast) {
      for (const castItem of vItem.cast) {
        const itemExtra = castItem.extra && validJson(castItem.extra) && JSON.parse(castItem.extra)
        castItem.order = itemExtra && itemExtra.order || 0
        castItem.character = itemExtra && itemExtra.character || ''
      }
      const cList = []
      const jobs = ['director', 'screenplay', 'writer']
      const findDir = vItem.cast.find(castItem => (castItem.job || '').toLowerCase() === jobs[0])
      const findScr = vItem.cast.find(castItem => (castItem.job || '').toLowerCase() === jobs[1])
      const findW = vItem.cast.find(castItem => (castItem.job || '').toLowerCase() === jobs[2])
      findDir && cList.push(findDir)
      findScr && cList.push(findScr)
      findW && cList.push(findW)
      let filtered = vItem.cast.filter(castItem => !castItem.job && castItem.known_for_department === 'Acting')
      filtered = filtered.sort((aItem, bItem) => {
        if (aItem.order > bItem.order) return 1
        return -1
      })
      cList.push(...filtered)
      fixTmdbImgUrl({artists: cList})
      vItem.cast = cList
    }
  }
  fixTmdbImgUrl({videos})
  const vRes = { videos, ...otherResData }
  return vRes
}
