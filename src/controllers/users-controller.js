const humps = require("humps")
const { ValidationError } = require("../lib/errors")
const db = require("../lib/db")
const assert = require('http-assert')
const {handleExtraJson, getDataType} = require('../utils/fileData')
const {APP_COMMON_CONF, APP_OTHER_CONF} = require('../constant/common')
const {tl} = require('../utils/locale')
const {BrowserWindow} = require('electron')
const {handlePathAndCategory} = require('./fs-controller')

module.exports = {
  async getConfig (ctx) {
    const {locale} = ctx.query
    const categories = await getCategories()
    const deepScanPath = await db('deepscan_path')
    const fileExclusion = await db('file_exclusion')
    const collectionSymbol = await db('collection_symbol')
    const {potentialDup, driveLabels, proxy, tmdbKey, clearDataBeforeAdding, keepThoseWatchedVideos, pathAndCategory, skipDriveLetter, skipPathForPathAndCategory} = await handleExtraJson()
    const formatFileName = await db('format_filename')
    const localeData = getLocaleData({locale})
    const res = {
      toUp: {
        dataTypes: getDataType({locale}).types,
        categories,
        deepScanPath,
        fileExclusion,
        collectionSymbol,
        driveLabels,
        formatFileName: formatFileName,
        proxy: proxy || '',
        tmdbKey,
        clearDataBeforeAdding: clearDataBeforeAdding || 0,
        keepThoseWatchedVideos: keepThoseWatchedVideos || 0,
        pathAndCategory: pathAndCategory || [],
        skipDriveLetter: skipDriveLetter || '',
        skipPathForPathAndCategory: skipPathForPathAndCategory || [],
      },
      isClearingCacheAvailable: !!BrowserWindow
    }
    if (potentialDup) {
      Object.assign(res.toUp, {potentialDup})
    }
    ctx.state.doNotTrans = true
    ctx.body = {...humps.camelizeKeys(res), ...localeData}
  },

  async upSettings (ctx) {
    const params = ctx.request.body
    const {prop, id, doRemove, name, dataTypeId, catId, potentialDup, replacing, locale, proxy, formatFileName, originalVal, tmdbKey, keepThoseWatchedVideos, clearDataBeforeAdding, pathAndCategory, skipDriveLetter, saveOnly, skipPathForPathAndCategory} = params
    const boolPair = [0, 1]
    const upTypes = {
      category: {
        dbName: 'category',
        dupPropName: 'name',
        reqDataTypeId: true,
        checkBeforeAdding: (upData) => {
          assert(upData.type, 'Data type id is required.')
        },
        async extraDel () {
          const ref = await db('cat_subcat').where({cat_id: id})
          for (const rItem of ref) {
            await db('cat_subcat').where({cat_id: rItem.cat_id}).del()
            await db('sub_category').where({id: rItem.sub_cat_id}).del()
          }
        },
        async beforeDel () {
          await syncFilesOnRemoveCategory({catId: id, ctx, replacing, locale})
        }
      },
      subCategory: {
        dbName: 'sub_category',
        dupPropName: 'name',
        async extraIdCheck () {
          if (doRemove || !id) {
            assert(!isNaN(catId), tl({locale, key: 'invalidValue', rep: 'catId'}))
          }
          const fCategory = await db('category').first({id: catId})
          assert(fCategory, tl({locale, key: 'cannotFindCategoryWithThisId'}))
        },
        async extraUp (pId) {
          await db('cat_subcat').insert({cat_id: catId, sub_cat_id: pId})
        },
        async extraDel () {
          await db('cat_subcat').where({cat_id: catId, sub_cat_id: id}).del()
        },
        async beforeDel () {
          await syncFilesOnRemoveCategory({subCatId: id, ctx, replacing, locale})
        }
      },
      collectionSymbol: {
        dbName: 'collection_symbol',
        dupPropName: 'name',
        extraNameCheck ({nameVal}) {
          const reg = /^[a-zA-Z0-9 #\.\-_\(\)\[\]]*$/
          const sValid = reg.test(nameVal)
          assert(sValid, tl({locale, key: 'CollectionSymbolOnlyFollowing'}))
        }
      },
      deepScanPath: {
        dbName: 'deepscan_path',
        dupPropName: 'name',
      },
      fileExclusion: {
        dbName: 'file_exclusion',
        dupPropName: 'name',
      },
      potentialDup: {
      },
      tmdbKey: {

      },
      proxy: {

      },
      clearDataBeforeAdding: {},
      keepThoseWatchedVideos: {},
      pathAndCategory: {},
      skipDriveLetter: {},
      formatFileName: {
        dbName: 'format_filename',
        dupPropName: 'name',
        async extraIdCheck () {
          if (!id) {
            assert(typeof name === 'string' && name.length < 16, tl({locale, key: 'invalidValue', rep: 'formatFileName'}))
            const vItems = await db('format_filename')
            assert(vItems.length <= 8, tl({locale, key: 'invalidValue', rep: 'formatFileName'}))
          }
        }
      }
    }
    const upType = upTypes[prop]
    // console.log(`boolPair clearDataBeforeAdding `, boolPair.includes(clearDataBeforeAdding))
    assert(upType, 'Invalid prop name.')

    const toUp = {}
    const dNow = new Date().toISOString()
    const res = {}
    const idName = upType.idName || 'id'

    let getItemByQuery

    if (upType.dbName === 'settings') {
      getItemByQuery = await db(upType.dbName).first()
    }

    if (potentialDup) {
      const pOptions = ['keep', 'override']
      if (pOptions.includes(potentialDup)) {
        await handleExtraJson({potentialDup})
      }
    }
    if (typeof tmdbKey === 'string') {
      const keyStr = tmdbKey.trim()
      const isValid = !tmdbKey || (tmdbKey.length >= 30 && tmdbKey.length <= 70)
      assert(isValid, tl({locale, key: 'invalidValue', rep: 'TMDb key'}))
      await handleExtraJson({tmdbKey: keyStr})
    }
    if (typeof proxy === 'string') {
      const regSt = /^(https?:\/\/)?(?:(\w+)(?::(\w+))?@)?((?:\d{1,3})(?:\.\d{1,3}){3})(?::(\d{1,5}))?$/gi
      const isValid = proxy.trim() === '' || regSt.test(proxy)
      assert(isValid, tl({locale, key: 'invalidProxyUrl'}))
      await handleExtraJson({proxy: proxy.trim()})
    }

    if (boolPair.includes(clearDataBeforeAdding)) {
      await handleExtraJson({toUp: {clearDataBeforeAdding}})
    }
    if (boolPair.includes(keepThoseWatchedVideos)) {
      await handleExtraJson({toUp: {keepThoseWatchedVideos}})
    }
    if (typeof skipDriveLetter === 'string') {
      await handleExtraJson({toUp: {skipDriveLetter}})
    }
    if (pathAndCategory) {
      await handleExtraJson({toUp: {pathAndCategory}})
    }
    if (skipPathForPathAndCategory) {
      await handleExtraJson({toUp: {skipPathForPathAndCategory}})
    }
    upType.extraIdCheck && await upType.extraIdCheck()

    if (id) {
      assert(!isNaN(id), tl({locale, key: 'invalidValue', rep: 'Id'}))
      getItemByQuery = await db(upType.dbName).first().where(idName, id)
      assert(getItemByQuery, tl({locale, key: 'cannotFindItemWithId'}))

      if (doRemove) {
        upType.beforeDel && await upType.beforeDel()
        await db(upType.dbName).where(idName, id).del()
        upType.extraDel && await upType.extraDel()
      }
    }

    if (!doRemove) {
      if (upType.dupPropName) {
        const pNameVal = params[upType.dupPropName]
        assert(pNameVal, `${upType.dupPropName} value cannot be empty`)

        const eVal = pNameVal
        const isNum = typeof eVal === 'number'
        const isStr = typeof eVal === 'string'
        const validValue = isStr || isNum

        assert(validValue, `Invalid ${upType.dupPropName}`)
        assert(isStr && pNameVal.length <= 250, `${upType.dupPropName} value cannot be empty`)
        upType.extraNameCheck && upType.extraNameCheck({nameVal: eVal})

        let dupItem

        dupItem = await db(upType.dbName).first().whereRaw(`LOWER(${upType.dupPropName}) = ?`, isNum ? eVal : eVal.toLowerCase())

        const noDup = !dupItem || (dupItem.id === id)
        assert(noDup, `This ${upType.dupPropName} value has already been assigned.`)

        Object.assign(toUp, {[upType.dupPropName]: eVal})
      }

      if (upType.reqDataTypeId && dataTypeId) {
        const fId = Number(dataTypeId)
        const findDataType = getDataType({byId: fId}).findType
        assert(findDataType, tl({locale, key: 'invalidValue', rep: 'dataTypeId'}))
        Object.assign(toUp, {type: fId})
      }

      if (upType.dbName && Object.keys(toUp).length) {
        if (getItemByQuery) {
          upType.avoidUpDate && Object.assign(toUp, {updated_at: dNow})
          await db(upType.dbName).where(idName, getItemByQuery[idName]).update(toUp)
        }
        else {
          upType.checkBeforeAdding && upType.checkBeforeAdding(toUp)
          const [tId] = await db(upType.dbName).insert(toUp).returning(idName)
          res[idName] = tId
          upType.extraUp && await upType.extraUp(tId)
        }
        Object.assign(res, toUp)
      }
    }
    if (!res.id && id) {
      res.id = id
    }
    ctx.body = res
  },
  async changeLang (ctx) {
    const {locale} = ctx.query
    ctx.state.doNotTrans = true
    ctx.body = {...getLocaleData({locale})}
  }
}

function getLocaleData ({locale}) {
  const localeData = APP_COMMON_CONF.DATA[locale] || APP_COMMON_CONF.DATA['en']
  const locales = APP_COMMON_CONF.locales
  return {localeData, locales}
}


async function getCategories (params) {
  const {withoutId, notSubId} = params || {}
  const builder = db('category')
  if (withoutId) {
    builder.whereNot('id', withoutId)
  }
  const categories = await builder
  for (const cat of categories) {
    const sBuilder = db('sub_category').leftJoin('cat_subcat', 'sub_category.id', 'cat_subcat.sub_cat_id')
    sBuilder.where('cat_subcat.cat_id', cat.id)
    if (notSubId) {
      sBuilder.whereNot('sub_category.id', notSubId)
    }
    cat.subCategories = await sBuilder
      .where('cat_subcat.cat_id', cat.id)
      .select([
        'sub_category.id',
        'sub_category.name',
        'cat_subcat.cat_id',
      ])
  }
  return categories
}

async function syncFilesOnRemoveCategory ({catId, subCatId, ctx, replacing, locale}) {

  const query = {}

  if (catId) {
    Object.assign(query, {cat_id: catId})
  }
  if (subCatId) {
    Object.assign(query, {sub_cat_id: subCatId})
  }
  const filesWithCategory = await db('file_category').where(query)
  let restCategories = []

  if (filesWithCategory.length) {
    restCategories = await getCategories({withoutId: catId, notSubId: subCatId})
  }
  const cLen = restCategories.length
  const onDel = async () => await db('file_category').where(query).del()
  if (!cLen) {
    await onDel()
  }
  if (cLen) {
    if (typeof replacing === 'object') {
      const {catId, subCatId} = replacing
      let newCId, findCategory
      let newSId = null
      if (catId > 0)  {
        findCategory = restCategories.find(rItem => rItem.id === catId)
        if (findCategory) {
          newCId = catId
        }
      }
      if (subCatId > 0 && findCategory && findCategory.subCategories) {
        const sItem = findCategory.subCategories.find(fItem => fItem.id === subCatId)
        if (sItem) {
          newSId = sItem.id
        }
      }
      if (newCId) {
        await db('file_category').where(query).update({cat_id: newCId, sub_cat_id: newSId})
      }
      else {
        await onDel()
      }
      return
    }

    ctx.body = {replacingCategories: restCategories}
  }
  assert(!restCategories.length, tl({
    locale,
    key: 'filesStillAssociatedWithIt',
    rep: tl({locale, key: catId ? 'category' : 'subCategory'})
  }))
}
