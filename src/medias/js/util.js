const DEF_CATEGORY_ITEM = () => ({id: -1, name: LNG.Uncategorized})
const LNG = {}
const pageSizeOptions = [30, 100, 200, 300, 1000]
const GLOBAL_DEF = {
  dataName: 'globalData',
  watchingItem: null, watchingElementIndex: null,
  pageInfo: {
    num: 1, limit: 100, totalPages: 0
  },
  videoInfo: [],
  drives: [],
  checkDirPath: '',
  selectedDriveLabel: '',
  dataTypes: [],
  categories: [],
  configInit: 0,
  allCategory: () => [DEF_CATEGORY_ITEM(), ...GLOBAL_DEF.categories],
  filter: {
    category: null, subCategory: null, driveLabel: 'All',
    query: null, sortBy: 'filename', reverseOrder: 0, wholeWord: 0,
    watchHistory: 0, watchlist: 0,
  },
  subCategoryDisplayForFilter: [],
  driveSelectedCat: null,
  driveSelectedSubCat: null,
  settingsData: {
  },
  deepscanPath: [],
  formatFileName: [],
  collectionSymbol : [],
  clearDataBeforeAdding: 0,
  keepThoseWatchedVideos: 0,
  driveLabels: [],
  potentialDup: 'keep',
  lastModalType: '',
  replacingCategoryParams: {},
  pageSizeOptions,
  locale: 'en',
  availableLocales: [],
  serverConf: {},
  proxy: '',
  tmdbKey: '',
  pathAndCategory: [],
  skipDriveLetter: '',
  skipPathForPathAndCategory: [],
  skipPathForPathAndCategoryClone: [],
}
const DATA_HELPERS = {
  queryVideoItem: null, queryVideoPage: 0,
  queriedVideos: [],
}
const apiUris = {
  query: '/video/search',
  video: '/video',
  searchFile: '/file/search',
}
const DEFAULT_FILTER = cloneArray(GLOBAL_DEF.filter)
function hasClass (el, name) {
  var rHasClass = /[\t\r\n]/g;
  if ( !el || !name ) {
    return false;
  }

  return ( ' ' + el.className + ' ' ).replace( rHasClass, ' ' ).indexOf( ' ' + name + ' ' ) >= 0;
};

function addClass (el, name) {
  if ( !el || !name ) {
    return false;
  }

  if ( !hasClass( el, name ) ) {
    el.className += ' ' + name;
  }
};

function removeClass ( el, name ) {
  var c = {};
  if ( !el || !name ) {
      return false;
  }

  if ( !c[name] ) {
    c[name] = new RegExp('(?:^|\\s)' + name + '(?!\\S)');
  }

  el.className = el.className.replace( c[name], '' );
};

function naturalCompare (a, b) {
  const ax = []
  const bx = []

  a.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { ax.push([$1 || Infinity, $2 || ""]) });
  b.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { bx.push([$1 || Infinity, $2 || ""]) });
  while(ax.length && bx.length) {
    const an = ax.shift();
    const bn = bx.shift();
    const nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
    if(nn) return nn;
  }

  return ax.length - bx.length;
}

function convertToGB (str) {
  let multiply = 1

  if (str.indexOf('tib') >= 0) {
    multiply = 1000
  }

  if (str.indexOf('mib') >= 0) {
    multiply = 0.001
  }

  if (str.indexOf('kib') >= 0) {
    multiply = 0.000001
  }
  return parseFloat(str) * multiply + 'GIB'
}

function cloneArray (arr) {
  return JSON.parse(JSON.stringify(arr))
}

function boldTitleByQuery (oQuery, oList, oTitle) {
  const isListArr = Array.isArray(oList)
  if (!isListArr) {
    oList = [
      {
        index: 0,
        value: oTitle,
        needBold: false,
      }
    ]
  }

  oList.forEach((item, itemKey) => {
    const itemValue = item.value
    const itemNeedBold = item.needBold
    const itemIndex = item.index
    const indexQ = itemValue.toUpperCase().indexOf(oQuery)

    if (itemNeedBold || indexQ < 0) return;

    const queryLen = oQuery.length
    const indexEnd = indexQ + queryLen
    const valueToReplace = itemValue.substring(indexQ, indexEnd)
    const fPart = itemValue.substring(0, indexQ)
    const endPart = itemValue.substring(indexEnd)
    const fIndex = isListArr ? (itemIndex > 0 ? itemIndex - 1 : 0) : 0
    const tList = [
      {
        value: fPart,
        needBold: false,
        index: fIndex
      },
      {
        value: valueToReplace,
        needBold: true,
        index: fIndex + 1
      },
      {
        value: endPart,
        needBold: false,
        index: fIndex + 2
      }
    ]
    oList.splice(itemIndex, 1, ...tList)
  })

  oList.forEach((item, itemKey) => {
    item.index = itemKey
  })

  return cloneArray(oList)
}
function handleLoader (params) {
  const { showLoader } = params
  const eLoader = document.querySelector('.loader')

  showLoader ? removeClass(eLoader, 'hidden') : addClass(eLoader, 'hidden')
}
function handleToast (params) {
  const { msg, showToast } = params
  const eToast = document.querySelector('.toast')
  const eToastMsg = document.querySelector('.toast-msg')
  if (showToast && msg) {
    removeClass(eToast, 'hidden')
    eToastMsg.innerHTML = msg
    const toastSt = setTimeout(() => {
      clearTimeout(toastSt)
      addClass(eToast, 'hidden')
    }, 2000)
  }
}
function hostUrl (params) {
  const {withoutProtocol} = params || {}
  const vHost = GLOBAL_DEF.serverConf.server.host || 'localhost'
  const vPort = GLOBAL_DEF.serverConf.server.port || ''
  const vProtocol = GLOBAL_DEF.serverConf.isHttps ? 'https' : 'http'
  const vPathUrl = `${vHost}${vPort ? ':' + vPort : ''}`
  const vUrl = `${vProtocol}://${vPathUrl}`

  if (withoutProtocol) {
    return vPathUrl
  }
  return vUrl
}
function apiRequest (params) {
  const { uri, urlParams, sendData, onData, method, fullUrl } = params
  const tUrl = fullUrl || `${hostUrl()}${uri}`
  const methodType = method || 'GET'
  const isUp = ['POST', 'DEL', 'PUT']
  const doGet = methodType === 'GET'
  const nUrl = new URL(tUrl)
  const sUrlParams = typeof urlParams === 'object' ? urlParams : {}

  if (doGet) {
    !sUrlParams.locale && (sUrlParams.locale = GLOBAL_DEF.locale)
    nUrl.search = new URLSearchParams(sUrlParams)
  }
  const argus = [nUrl]
  const headerObj = {}
  if (isUp) {
    Object.assign(headerObj, {'content-type': 'application/json'})
  }
  const headers = new Headers(headerObj)
  const jsonData = {
    method: methodType,
    headers,
    body: null,
  }
  handleLoader({ showLoader: true })

  if (sendData) {
    sendData.locale = GLOBAL_DEF.locale
    jsonData.body = JSON.stringify(sendData)
    argus.push(jsonData)
  }

  return fetch(...argus)
    .then(res => res.json())
    .then(res => {
      handleLoader({ showLoader: false })
      if (res) {
        console.log(`apiRequest URL: ${tUrl}::::::::RES::`, res)
        const errMsg = res.errors
        if (errMsg) {
          handleToast({msg: errMsg, showToast: true})
        }
      }
      onData && onData(res)
    })
    .catch(err => {
      handleLoader({ showLoader: false })
    })
}
function scrollbarVisible(element) {
  return element.scrollHeight > element.clientHeight;
}
function isObject (obj) {
  var type = typeof obj;
  return type === 'function' || type === 'object' && !!obj;
}
function isUndefined (obj) {
  return typeof obj === 'undefined'
}
function formatUrlParams (params, extendedObj={}, removeKeys) {
  if (!params && !extendedObj) return ''

  const sString = params.substring(1)
  const sStringSplits = sString.split('&').filter(item => item.trim() !== '')
  const paramObj = sStringSplits.reduce(function (obj, item) {
    const itemSplit = item.split('=')
    const itemName = itemSplit[0]
    const itemVal = itemSplit[1] || ''
    obj[itemName] = itemVal
    return obj
  }, {})
  const basicKeys = ['label', 'type', 'condition']
  // console.log(`FORMAT URL PARAMS::::::::`, params, 'extendedObj:::::::', extendedObj, '???????????? sStringSplits:::::::', sStringSplits)
  const isCheckHistoryOrWatchlist = Number(paramObj.watchHistory) || Number(paramObj.watchlist)
  let shouldResetLabelVal = isCheckHistoryOrWatchlist
  const requirePage = isCheckHistoryOrWatchlist

  if (requirePage) {
    if (!paramObj.page) {
      sStringSplits.push(`page=${GLOBAL_DEF.pageInfo.num}`)
    }
    if (!paramObj.limit) {
      sStringSplits.push(`limit=${GLOBAL_DEF.pageInfo.limit}`)
    }
  }

  let sStringList = sStringSplits.map(item => {
    const itemSplit = item.split('=')
    const prop = itemSplit[0]
    const propVal = itemSplit[1]
    let value = propVal ? decodeURIComponent(propVal) : ''

    if (typeof extendedObj[prop] !== 'undefined' && extendedObj[prop] !== value) {
      value = extendedObj[prop]
    }
    delete extendedObj[prop]
    return {
      [prop]: encodeURIComponent(value || '')
    }
  })

  // console.log(`FORMAT URL PARAMS OBJ: `, sStringList)
  if (extendedObj.getRealObj) {
    return {paramObj}
  }
  if (extendedObj.getObject) {
    return sStringList
  }

  for (const key in extendedObj) {
    sStringList.push({ [key]: extendedObj[key] })
  }
  for (const sItem of sStringList) {
    const kProp = Object.keys(sItem)[0]
    if (shouldResetLabelVal && kProp === 'label') {
      sItem[kProp] = 'ALL'
    }
  }

  if (Array.isArray(removeKeys) && removeKeys.length) {
    sStringList = sStringList.filter(item => !removeKeys.includes(Object.keys(item)[0]))
  }

  if (removeKeys === 'clear') {
    sStringList = sStringList.filter(item => basicKeys.includes(Object.keys(item)[0]))
  }

  return sStringList.map(item => `${Object.keys(item)[0]}=${item[Object.keys(item)[0]]}`).join('&')
}
function navigateTo (params) {
  const { origin, pathname } = location
  let tLocation = origin + pathname

  if (params) {
    tLocation += '?' + params
  }

  return tLocation
}

function onLabelClick (labelName) {
  const query = formatUrlParams(location.search, {label: labelName})
  location.href = navigateTo(query)
}
function getItemData (idx) {
  const ele = document.querySelector(`.row.hdd-item[data-index="${idx}"]`)
  if (!ele) return console.warn('Cannot find this index::::::', idx)
  const qItemData = ele.dataset.item
  let qItemJson = null
  try {
    qItemJson = JSON.parse(qItemData)
  }
  catch (err) {}
  const isWatched = qItemJson && qItemJson.watched === 1
  const isScheduled = qItemJson && qItemJson.watch > 1
  const rData = {itemJson: qItemJson, isWatched, isScheduled}
  return rData
}
function upWatchingFeeling (idx, other) {
  const tOtherParams = typeof other === 'object' ? other : {}
  const {noUpValue, upItemStyle} = tOtherParams
  const list = {
    0: {
      label: '',
      color: '',
      emoji: '',
      bgVal: 0,
      passVal: 0,
    },
    1: {
      label: LNG.Yes,
      color: '#3ddc17',
      fontSize: '14px',
      emoji: '😄',
      bgVal: 2,
      passVal: 2,
    },
    2: {
      label: LNG.lookingForward,
      color: '#daad00',
      fontSize: '15px',
      emoji: '😆',
      bgVal: 3,
      passVal: 3,
    },
    3: {
      label: LNG.cantWait,
      color: '#e27500',
      fontSize: '16px',
      emoji: '😂',
      bgVal: 4,
      passVal: 4,
    }
  }
  const item = list[idx]
  if (item) {
    const rVal = item.passVal

    if (upItemStyle && GLOBAL_DEF.watchingElementIndex) {
      const eItem = document.querySelector(`.row.hdd-item[data-index="${GLOBAL_DEF.watchingElementIndex}"]`)
      if (eItem) {
        eItem.setAttribute('data-watching', item.bgVal)
      }
    }
    if (GLOBAL_DEF.watchingItem) {
      GLOBAL_DEF.watchingItem.watch = rVal
    }
    if (!noUpValue) {
      const eWv = document.querySelector('.watch-status-displayValue')
      eWv.innerHTML = `${item.label} ${item.emoji}`
      item.color && (eWv.style.color = item.color)
      if (item.fontSize) {
        eWv.style.fontSize = item.fontSize
      }
    }
  }
}
function upWatchingStatus ({itemJson, nWatch, eItem, changingStatus, isWatched, iconWatch, iconSchedule}) {
  const validateFinished = typeof isWatched !== 'undefined'
  const isChangingStatus = typeof changingStatus !== 'undefined'
  const wVal = isNaN(Number(nWatch)) ? 0 : Number(nWatch)
  apiRequest({
    uri: apiUris.video,
    method: 'PUT',
    sendData: {id: itemJson.id, watch: wVal},
    onData: (res) => {
      try {
        if (validateFinished) {
          if (isWatched) {
            removeClass(eItem, 'watched')
            eItem.setAttribute('data-watching', 0)
            iconWatch && removeClass(iconWatch, 'do-show')
          }
          else {
            addClass(eItem, 'watched')
            iconWatch && addClass(iconWatch, 'do-show')
          }
        }

        if (isChangingStatus) {
          onHideWatchingModal()
          const kVal = wVal ? wVal - 1 : 0
          const showIcon = kVal > 0
          if (showIcon) {
            iconSchedule && removeClass(iconSchedule, 'visHidden')
          }
          else {
            iconSchedule && addClass(iconSchedule, 'visHidden')
          }
          upWatchingFeeling(kVal, {noUpValue: true, upItemStyle: true})
        }

        if (itemJson) {
          if (validateFinished) {
            if (isWatched) {
              delete itemJson.watched
            }
            else {
              itemJson.watched = 1
            }
          }
          itemJson.watch = wVal
          eItem.setAttribute('data-item', JSON.stringify(itemJson))
        }
        handleWatchingMedals({eItem, num: wVal})
      }
      catch (err) {
        console.error(err)
      }
    }
  })
}
function findAncestor (el, cls) {
  while ((el = el.parentElement) && !el.classList.contains(cls));
  return el;
}
function handleWatchingMedals ({metalElement, eItem, num}) {
  const hideMedal = num < 2
  let eMedal = metalElement || (eItem && eItem.querySelector('.item-medal'))
  if (!eMedal) {
    return console.warn('Cant find medal element.', eItem, 'eMedal: ', eMedal, `eItem.querySelector('.item-medal')`, eItem.querySelector('.item-medal'))
  }
  eMedal.innerHTML = ''
  if (!hideMedal) {
    const arr = new Array(num-1).fill('')
    for (const item of arr) {
      const eImg = document.createElement('img')
      eImg.src = `./medias/img/medal.png`
      eImg.setAttribute('width', 16)
      eMedal.appendChild(eImg)
    }
  }
}
function handleWatchStatusModal ({style, initWatching}) {
  const rFrom = 0
  const fEnd = 3
  const rStep = 1
  const rInitValue = initWatching || rFrom
  let rValue = rInitValue
  const sliderM = document.querySelector('.watch-status-m')
  const sliderWp = document.querySelector('.watch-statusWp')
  const slider = document.querySelector('#watch-status')
  removeClass(sliderM, 'hidden')
  if (style) {
    for (const prop of Object.keys(style)) {
      sliderWp.style[prop] = style[prop]
    }
  }
  slider.setAttribute('min', rFrom)
  slider.setAttribute('max', fEnd)
  slider.value = rValue
  upWatchingFeeling(rValue)
}
function onHideWatchingModal () {
  addClass(document.querySelector('.watch-status-m'), 'hidden')
  document.querySelector('.watch-statusWp').setAttribute('style', '')
}
function validJson (str) {
  try {
    JSON.parse(str)
  }
  catch (e) {
    return false
  }
  return true
}

function handlePager ({initLoad, noUpOptions}) {
  const ePager = document.querySelector('.pager')
  const ePrev = document.querySelector('.prev-page')
  const eNext = document.querySelector('.next-page')
  const eSel = document.querySelector('#select-page')
  const eLoadMore = document.querySelector('.load-more')
  const showPager = () => {
    removeClass(ePager, 'hidden')
  }

  if (initLoad) {
    // ePrev.addEventListener('click', navPage)
    // eNext.addEventListener('click', navPage)
    eSel.addEventListener('change', (evt) => {
      const val = evt.target.value
      changePage(val, {doClear: true})
    })
    eLoadMore.addEventListener('click', (evt) => {
      const isDisabled = hasClass(evt.target, 'disabled')

      if (isDisabled) {
        handleToast({msg: LNG.noMoreData, showToast:  true})
        return console.warn('========= DISABLED =========')
      }
      changePage(GLOBAL_DEF.pageInfo.num + 1)
    })
  }

  const {totalPages, num} = GLOBAL_DEF.pageInfo
  const gotMorePage = num < totalPages
  const gotPrevPage = num > 1

  if (!gotMorePage) {
    // addClass(eNext, 'disabled')
    addClass(eLoadMore, 'disabled')
  }
  if (gotPrevPage) {
    // removeClass(ePrev, 'disabled')
  }
  if (gotMorePage) {
    // removeClass(eNext, 'disabled')
    removeClass(eLoadMore, 'disabled')
  }

  function upPageOptions () {
    if (totalPages) {
      const arr = new Array(totalPages).fill('').map((n, idx) => idx + 1)
      const eOptions = eSel.querySelectorAll('option')
      const currentOptionLen = Array.from(eOptions).length

      if (arr.length !== currentOptionLen) {
        eSel.innerHTML = ''
        for (const idx of arr) {
          const ele = document.createElement('option')
          ele.className = 'page-option nR-option'
          ele.innerHTML = idx
          eSel.appendChild(ele)
        }
      }
      eSel.value = num
    }
  }

  !noUpOptions && upPageOptions()

  function changePage (pNum, extraParams) {
    searchFiles({page: pNum, extraParams})
  }
  function navPage (event) {
    const isNext = hasClass(event.target, 'next-page')
    const isDisabled = hasClass(event.target, 'disabled')

    if (isDisabled) {
      return console.warn('========= DISABLED =========')
    }

    const newPageNum = isNext ? GLOBAL_DEF.pageInfo.num + 1 : GLOBAL_DEF.pageInfo.num - 1
    changePage(newPageNum)
  }
}

function appendElementDataItem ({jsonData, index}) {
  const eWrapper = document.querySelector('.row-wrapper')
  const ele = document.createElement('div')
  const isWatched = jsonData.watched
  const aClass = `row hdd-item${isWatched ? ' watched' : ''}`
  const aWatchingVal = (jsonData.watched || !jsonData.watch) ? 0 : jsonData.watch
  const dPropCls = 'hdd-data-valueCell'
  const dataItemData = cloneArray(jsonData)
  dataItemData.videos && delete dataItemData.videos
  ele.setAttribute('data-item', JSON.stringify(dataItemData))
  ele.setAttribute('data-index', index)
  ele.setAttribute('data-watching', aWatchingVal)
  ele.dataset.fileid = jsonData.id
  ele.className = aClass
  const {dataType} = jsonData

  const divQuery = document.createElement('div')
  divQuery.className = 'query-item'
  const querySpan = document.createElement('span')
  divQuery.appendChild(querySpan)

  const divTitle = document.createElement('div')
  divTitle.className = `data-name ${dPropCls}`
  const divTitleVal = document.createElement('div')
  divTitleVal.className = 'data-title-value'
  divTitleVal.setAttribute('data-title', jsonData.name)
  divTitleVal.innerHTML = jsonData.name
  divTitle.appendChild(divTitleVal)
  const divMetal = document.createElement('div')
  divMetal.className = 'item-medal'
  const querySpan2 = document.createElement('span')
  divMetal.appendChild(querySpan2)
  divTitle.appendChild(divMetal)


  const divCategory = document.createElement('div')
  divCategory.className = `data-category ${dPropCls}`
  const cName = jsonData.categoryName || ''
  const cSName = jsonData.subCategoryName ? ` / ${jsonData.subCategoryName}` : ''
  divCategory.innerHTML = `${cName}${cSName}`

  const divType = document.createElement('div')
  divType.className = `data-type ${dPropCls}`
  divType.innerHTML = jsonData.type

  const divSize = document.createElement('div')
  divSize.className = `data-size ${dPropCls}`
  divSize.innerHTML = jsonData.readableSize || 0

  const divLabel = document.createElement('div')
  divLabel.className = `data-label ${dPropCls}`
  divLabel.innerHTML = jsonData.drive_label
  divLabel.addEventListener('click', () => {
    onLabelClick(jsonData.drive_label)
  })

  const divPath = document.createElement('div')
  divPath.className = `data-filepath ${dPropCls}`
  divPath.innerHTML = jsonData.filepath || ''
  divPath.title = divPath.innerHTML

  const divActions = document.createElement('div')
  divActions.className = 'data-actions'

  const eImgSchedule = document.createElement('img')
  const scheduleClass = 'action-schedule c-boxShadowD1' + (aWatchingVal ? '' : ' visHidden')
  // console.log(`aWatchingVal::::::::::`, aWatchingVal, scheduleClass)
  eImgSchedule.className = scheduleClass
  eImgSchedule.src = './medias/img/clock.png'
  eImgSchedule.width = 16
  eImgSchedule.style.marginRight = '5px'
  // initActionScheduleEvent({imgEl: eImgSchedule, aIndex: index})
  divActions.appendChild(eImgSchedule)

  const eImgWatch = document.createElement('img')
  const watchClass = 'action-watched c-boxShadowD1' + (isWatched ? '' : ' visHidden')
  eImgWatch.className = watchClass
  eImgWatch.src = './medias/img/check.png'
  eImgWatch.width = 20
  // initActionWatchEvent({imgEl: eImgWatch, aIndex: index})
  divActions.appendChild(eImgWatch)

  const selectAll = document.querySelector('.hdd-itemSelection-all')
  const isAllCkBoxShowing = !hasClass(selectAll, 'hidden')
  const selectEl = document.createElement('input')
  const selAddHiddenCls = isAllCkBoxShowing ? '' : ' hidden'
  selectEl.className = `hdd-itemSelection-item ckbox-square${selAddHiddenCls}`
  selectEl.type = 'checkbox'
  if (selectAll.checked) {
    selectEl.checked = true
  }

  eWrapper.appendChild(ele)
  ele.appendChild(divQuery)
  ele.appendChild(divTitle)
  ele.appendChild(divCategory)
  ele.appendChild(divType)
  ele.appendChild(divSize)
  ele.appendChild(divLabel)
  ele.appendChild(divPath)
  ele.appendChild(divActions)
  ele.appendChild(selectEl)
  selectEl.addEventListener('change', onSquareBoxChange)
  initDataItemElementEvent({eItem: ele, aIndex: index, dataType})

  if (aWatchingVal > 1) {
    handleWatchingMedals({eItem: null, metalElement: divMetal, num: aWatchingVal})
  }
  if (jsonData.videos) {
    for (const vInfo of jsonData.videos) {
      handleVideoInfoElement({rootEl: ele, vInfo})
    }
  }
}
function getSafePopMenuArea ({elSelector, evt, considerH}) {
  const elSel = elSelector || 'body'
  const {width, height, x, y, top, bottom, left, right} = document.querySelector(elSel).getBoundingClientRect()
  const {clientHeight: winH} = document.body
  const halfH = height / 2
  const divY = y + halfH
  const {pageX, pageY} = evt
  const tRight = width - pageX
  const isBelow = pageY > divY
  const style = {
    position: 'fixed',
    right: `${tRight}px`,
  }

  if (considerH) {
    const halfW = width / 2
    const divX = x + halfW
    const isLeft = pageX < divX
    if (isLeft) {
      delete style.right
      Object.assign(style, {left: pageX})
    }
  }
  const oStyle = isBelow ? {bottom: (winH - pageY) + 'px'} : {top: pageY + 'px'}
  Object.assign(style, oStyle)
  console.log(`evt:::::::x:${x} ------- height:${height} ------- halfH:${halfH} ------- y:${y} ------- divY:${divY} ------- tRight:${tRight} ------- pageY:${pageY} ------- isBelow:${isBelow} ------- `)
  return {style}
}
/* function initActionScheduleEvent ({imgEl, aIndex}) {
  imgEl.addEventListener('click', evt => {
    const {itemJson} = getItemData(aIndex)
    if (itemJson && itemJson.watched) {
      return handleToast({ msg: LNG.youHaveWatchedIt, showToast: true })
    }
    GLOBAL_DEF.watchingItem = itemJson
    GLOBAL_DEF.watchingElementIndex = aIndex
    const {style} = getSafePopMenuArea({elSelector: '.row-wrapper', evt})
    handleWatchStatusModal({style, initWatching: (itemJson.watch && itemJson.watch - 1) || 0})
  })
}
function initActionWatchEvent ({imgEl, aIndex}) {
  imgEl.addEventListener('mouseenter', evt => {
    const {isWatched} = getItemData(aIndex)
    if (isWatched) {
      imgEl.setAttribute('src', './medias/img/remove.png')
    }
  })
  imgEl.addEventListener('mouseleave', evt => {
    imgEl.setAttribute('src', './medias/img/check.png')
  })
  imgEl.addEventListener('click', evt => {
    const {itemJson, isWatched} = getItemData(aIndex)
    const eItem = document.querySelector(`.row.hdd-item[data-index="${aIndex}"]`)
    if (itemJson) {
      const nWatch = isWatched ? 0 : 1
      upWatchingStatus({nWatch, isWatched, eItem, itemJson, imgEl})
    }
  })
} */

function initDataItemElementEvent ({eItem, dataType, aIndex}) {
  const iconWatch = eItem.querySelector('.action-watched')
  const iconSchedule = eItem.querySelector('.action-schedule')
  const qItem = eItem.querySelector('.query-item')
  const itemEvent = itemEvents({aIndex, dataType, iconWatch, iconSchedule, qItem})
  const queryEvent = itemEvent && itemEvent.query
  const scheduleEvent = itemEvent && itemEvent.schedule
  const watchEvent = itemEvent && itemEvent.watch

  if (queryEvent) {
    qItem.addEventListener('click', itemEvent.query)
  }
  else {
    addClass(qItem, 'unavailable-gp')
  }
  if (scheduleEvent) {
    iconSchedule.addEventListener('click', scheduleEvent)
  }
  else {
    addClass(iconSchedule, 'unavailable-gp')
  }
  if (watchEvent) {
    iconWatch.addEventListener('click', watchEvent)
    iconWatch.addEventListener('mouseleave', evt => {
      iconWatch.setAttribute('src', './medias/img/check.png')
    })
    iconWatch.addEventListener('mouseenter', evt => {
      const {isWatched} = getItemData(aIndex)
      if (isWatched) {
        iconWatch.setAttribute('src', './medias/img/remove.png')
      }
    })
  }
  else {
    addClass(iconWatch, 'unavailable-gp')
  }
  eItem.addEventListener('mouseenter', evt => {
    const {isScheduled, isWatched} = getItemData(aIndex)
    addClass(eItem, 'hover')
    removeClass(iconWatch, 'visHidden')
    !isWatched && removeClass(iconSchedule, 'visHidden')
  })
  eItem.addEventListener('mouseleave', evt => {
    const {isScheduled, isWatched} = getItemData(aIndex)
    removeClass(eItem, 'hover')
    !isWatched && addClass(iconWatch, 'visHidden')
    !isScheduled && addClass(iconSchedule, 'visHidden')
  })

}
function itemEvents ({aIndex, dataType, iconWatch, iconSchedule, qItem}) {
  const events = {
    video: {
      schedule: () => {
        const {itemJson} = getItemData(aIndex)
        if (itemJson && itemJson.watched) {
          return handleToast({ msg: LNG.youHaveWatchedIt, showToast: true })
        }
        GLOBAL_DEF.watchingItem = itemJson
        GLOBAL_DEF.watchingElementIndex = aIndex
        const {style} = getSafePopMenuArea({elSelector: '.row-wrapper', evt: event})
        handleWatchStatusModal({style, initWatching: (itemJson.watch && itemJson.watch - 1) || 0})
      },
      watch: () => {
        const {itemJson, isWatched} = getItemData(aIndex)
        const eItem = document.querySelector(`.row.hdd-item[data-index="${aIndex}"]`)
        if (itemJson) {
          const nWatch = isWatched ? 0 : 1
          upWatchingStatus({nWatch, isWatched, eItem, itemJson, imgEl: iconWatch})
        }
      },
      query: () => {
        const {itemJson} = getItemData(aIndex)

        if (itemJson) {
          removeInvalidKeys(itemJson)
          DATA_HELPERS.queryVideoItem = itemJson

          apiRequest({
            uri: apiUris.query,
            urlParams: {id: itemJson.id},
            onData: (res) => {
              if (res) {
                Object.assign(res, {refItemElIndex: aIndex})
              }
              try {
                videoItems(res)
              }
              catch (err) {
              }
            }
          })
        }
      }
    }
  }
  const itemEvent = events[dataType]
  return itemEvent
}
function removeInvalidKeys (params) {
  const keys = Object.keys(params)

  for (const key of keys) {
    const kVal = params[key]
    const invalid = typeof kVal === 'undefined' || kVal === null
    invalid && delete params[key]
  }

}

function onFilterCategoryChange ({catId, subCatId, doReRender, dataObj, loadCategoryFn, loadSubCategoryFn}) {
  console.log(`onFilterCategoryChangeFn:::::::::`, arguments)
  let doReRenderSub = false
  let doReRenderCategory = doReRender || false
  const tDataObj = dataObj || GLOBAL_DEF
  console.log(`onFilterCategoryChangeFn GLOBAL_DEF `, JSON.parse(JSON.stringify(GLOBAL_DEF)), dataObj)
  if (catId) {
    let findCategory = catId > 0 && tDataObj.categories.find(c => c.id === catId)
    console.log(`onFilterCategoryChangeFn findCategory `, findCategory)
    tDataObj.filter.category = findCategory || null

    const hasSub = tDataObj.filter.category && tDataObj.filter.category.subCategories && tDataObj.filter.category.subCategories.length > 0

    if (!hasSub) {
      if (tDataObj.filter.subCategory) {
        tDataObj.filter.subCategory = null
      }
      doReRenderSub = true
      tDataObj.subCategoryDisplayForFilter = []
    }
    if (hasSub) {
      tDataObj.subCategoryDisplayForFilter = [...cloneArray(tDataObj.filter.category.subCategories)]

      appendDefaultSelectionItem(tDataObj.subCategoryDisplayForFilter)

      const findSel = tDataObj.subCategoryDisplayForFilter.find(c => c.id === tDataObj.filter.subCategory && tDataObj.filter.subCategory.id)

      if (!findSel) {
        tDataObj.filter.subCategory = tDataObj.subCategoryDisplayForFilter[0]
        doReRenderSub = true
      }
    }
    handleGlobalData({doSave: true})
  }
  if (subCatId) {
    const findSub = tDataObj.subCategoryDisplayForFilter && tDataObj.subCategoryDisplayForFilter.find(c => c.id === subCatId)

    tDataObj.filter.subCategory = findSub || null
    handleGlobalData({doSave: true})
  }

  if (doReRenderCategory) {
    loadCategoryFn ? loadCategoryFn() : loadCategory()
  }
  if (doReRenderSub) {
    loadSubCategoryFn ? loadSubCategoryFn() : loadSubCategory()
  }
  console.log(`onFilterCategoryChangeFn GLOBAL_DEF ^^^^^^^^^ `, JSON.parse(JSON.stringify(GLOBAL_DEF)))
}

function handleGlobalData (params) {
  const {doSave, doGet} = params || {}

  if (doSave) {
    const sData = {global: GLOBAL_DEF}
    localStorage.setItem(GLOBAL_DEF.dataName, JSON.stringify(sData))
  }
  if (doGet) {
    const sData = localStorage.getItem(GLOBAL_DEF.dataName)

    if (validJson(sData)) {
      const gData = JSON.parse(sData)
      console.log(`handleGlobalDataFN GET:::::::`, gData)
      if (gData && gData.global) {
        Object.assign(GLOBAL_DEF, gData.global)
      }
    }
    GLOBAL_DEF.pageInfo.num = 1
    GLOBAL_DEF.pageInfo.totalPages = 0
    GLOBAL_DEF.configInit = 0
    GLOBAL_DEF.watchingElementIndex = null
    GLOBAL_DEF.watchingItem = null
    GLOBAL_DEF.videoInfo = []
    GLOBAL_DEF.pageSizeOptions = pageSizeOptions

    if (GLOBAL_DEF.driveLabels.length) {
      loadDriveLabelElement()
    }

    if (GLOBAL_DEF.filter.query) {
      document.querySelector('#search').value = GLOBAL_DEF.filter.query
    }
    if (GLOBAL_DEF.filter.watchHistory) {
      document.querySelector('#ckbox-watched').setAttribute('checked', true)
    }
    if (GLOBAL_DEF.filter.watchlist) {
      document.querySelector('#ckbox-watchlist').setAttribute('checked', true)
    }
    if (GLOBAL_DEF.filter.wholeWord) {
      document.querySelector('#ckbox-strict').setAttribute('checked', true)
    }
  }
}

function onSquareBoxChange (params) {
  const {eTarget} = params || {}
  const eT = eTarget || event.target
  const isAll = eT.dataset.checkbox === 'all'
  const isChecked = eT.checked
  const rows = Array.from(document.querySelectorAll('.row.hdd-item .hdd-itemSelection-item'))
  const allCk = document.querySelector('.hdd-itemSelection-all')
  // console.log(`onSquareBoxChange::::::::isAll:${isAll}:::isChecked:${isChecked}:`, )

  if (isAll) {
    for (const row of rows) {
      row.checked = isChecked
    }
    if (!rows.length && isChecked) {
      allCk.checked = false
    }
  }

  if (!isAll) {
    if (isChecked) {
      const rLen = rows.length
      const rChecked = rows.filter(r => r.checked)
      const checkedLen = rChecked.length
      const isAllChecked = rLen === checkedLen
      if (isAllChecked) {
        allCk.checked = true
      }
    }
    else {
      if (allCk.checked) {
        allCk.checked = false
      }
    }
  }

  handleMoreActionRender()
}
function handleMoreActionRender () {
  const gotCheck = document.querySelectorAll('.row.hdd-item .hdd-itemSelection-item:checked').length > 0
  const mAction = document.querySelector('.hdd-item-moreActions')

  gotCheck ? removeClass(mAction, 'hidden') : addClass(mAction, 'hidden')
}
function popMenu ({evt, items}) {
  const {style} = getSafePopMenuArea({evt, considerH: true})
  handleModalStyle('menus', 'open')
  const wrapper = document.querySelector('.popMenu-container')
  const wList = document.querySelector('.popMenu-list')
  if (style) {
    for (const prop of Object.keys(style)) {
      wrapper.style[prop] = style[prop]
    }
  }
  wList.innerHTML = ''
  if (items) {
    for (const item of items) {
      const div = document.createElement('div')
      div.className = 'popMenu-item'
      const label =  document.createElement('span')
      label.className = 'popMenu-item-label'
      label.textContent = item.label || ''
      div.addEventListener('click', () => {
        handleModalStyle(GLOBAL_DEF.lastModalType, 'close')
        item.onClick && item.onClick()
      })
      wList.appendChild(div)
      div.appendChild(label)
    }
  }
}
function popMoreActions () {
  const items = []
  const itemDel = {
    label: LNG.delete,
    onClick () {
      popBox({
        msg: LNG.sureToDelAllCat,
        labelOk: LNG.Continue,
        supportCloseBtn: true,
        onOk () {
          handleSelectedAction({doDel: true})
        }
      })
    }
  }
  const itemMov = {
    label: LNG.moveSelectedToAnotherCat,
    onClick () {
      // handleSelectedAction({doMove: true})
      popBox({
        supportCloseBtn: true,
        labelOk: LNG.Continue,
        onRenderMsg ({msgWp}) {
          renderReplacingCategory({
            msgWp,
            categories: cloneArray(GLOBAL_DEF.categories),
            hideSubTitle: true,
            msgTitle: LNG.selectACat,
          })
        },
        onOk () {
          handleSelectedAction({
            doMoveCategory: true,
          })
        }
      })
    }
  }
  items.push(itemDel)
  if (GLOBAL_DEF.categories.length) {
    items.push(itemMov)
  }
  popMenu({
    evt: event,
    items,
  })
}

function handleSelectedAction ({doDel, doMoveCategory}) {
  const selectedItems = Array.from(document.querySelectorAll('.row.hdd-item')).filter(item => item.querySelector('.hdd-itemSelection-item').checked)

  if (selectedItems.length) {
    const ids = []
    for (const item of selectedItems) {
      const itemData = item.dataset.item
      if (validJson(itemData)) {
        const vData = JSON.parse(itemData)

        if (vData.id) {
          ids.push(vData.id)
        }
      }
    }

    if (doDel) {
      delFiles({
        ids,
        onSuccess () {
          handleToast({msg: LNG.delSuccessfully, showToast: true})
          selectedItems.forEach(item => item.parentNode.removeChild(item))
          onSquareBoxChange({eTarget: document.querySelector('.hdd-itemSelection-all')})
        }
      })
    }
    if (doMoveCategory) {
      const params = {ids, ...GLOBAL_DEF.replacingCategoryParams, doChangeCategory: true}
      upFiles({params, onSuccess () {
        searchFiles({
          onUp () {
            onSquareBoxChange({eTarget: document.querySelector('.hdd-itemSelection-all')})
          }
        })
      }})
    }
  }
}

function delFiles ({ids, onSuccess}) {
  const sendData = {ids}
  apiRequest({
    method: 'DELETE',
    uri: '/file',
    sendData,
    onData (data) {
      if (!data.errors) {
        onSuccess && onSuccess()
      }
    }
  })
}

function upFiles ({params, onData, onSuccess}) {
  const sendData = {}
  params && Object.assign(sendData, params)
  apiRequest({
    method: 'POST',
    uri: '/files',
    sendData,
    onData (data) {
      if (data && data.errors) {
        handleToast({msg: data.errors, showToast: true})
      }
      if (!data.errors) {
        handleToast({msg: LNG.upSuccessfully, showToast: true})
        onSuccess && onSuccess()
      }
      onData && onData(data)
    }
  })
}
function getSortByOptions () {
  return [
    {prop: 'filename', label: LNG.filename},
    {prop: 'filetype', label: LNG.filetype},
    {prop: 'filesize', label: LNG.filesize},
    {prop: 'drivelabel', label: LNG.driveLabel},
  ]
}

function getSiblings (params) {
  const {el, dir = 'next', ignoreTextNode = true, filterByClsName} = params || {}
  const siblings = []
  const doGetPrev = dir === 'prev'
  const sibProp = doGetPrev ? 'previousSibling' : 'nextSibling'
  const findSibEl = (vEl) => {
    const sibEl = vEl[sibProp]
    console.log(`getSiblings ------------ sibEl ${sibProp} `, sibEl)
    if (sibEl) {
      const isTextNode = ignoreTextNode && sibEl.nodeType === 3
      const doFilterByClsName = !filterByClsName || sibEl.className.includes(filterByClsName) === true
      console.log(`getSiblings isTextNode ${isTextNode} doFilterByClsName ${doFilterByClsName}`)
      if (!isTextNode && doFilterByClsName) {
        siblings.push(sibEl)
      }
      findSibEl(sibEl)
    }
  }
  findSibEl(el)
  const length = siblings.length
  const res = {length, siblings}
  return res
}

function countOccurrences (params) {
  const {list, asPropName = 'name'} = params || {}
  const findDup = list
      .reduce((dupRes, item) => {
        const isItemObj = isObject(item)
        const toCompareName = isItemObj ? item[asPropName] : item
        let findItem = dupRes.find(dItem => dItem.name === toCompareName)
        if (!findItem) {
          findItem = {...(isItemObj ? item : {}), name: toCompareName, count: 1}
          dupRes.push(findItem)
        }
        else {findItem.count++}
        return dupRes
      }, [])
      .sort((a, b) => {
        if (b.count > a.count) return 1;
        return -1;
      })


  const res = {listSortedByOccurrences: findDup, dupMax: null}
  if (findDup[0] && findDup[0].count > 1) {
    res.dupMax = findDup[0]
  }
  console.log(`countOccurrences RES `, res)
  return res
}

function openWebSocket (params) {
  const {url, protocols = [], onCloseWs, onRecvMsg, urlParams = {}, locale} = params || {}
  const serverUrl = hostUrl({withoutProtocol: true})
  console.log(`openWebSocket serverUrl `, serverUrl)

  urlParams.locale = GLOBAL_DEF.locale
  locale && Object.assign(urlParams, {locale})

  const urlParamsToStr = new URLSearchParams(urlParams)
  const wsUrl = `ws://${serverUrl}${url}?${urlParamsToStr}`
  const ws = new WebSocket(
    wsUrl,
    [...protocols]
  )
  ws.onopen = (event) => {
    ws.send('test Ws')
  }

  const closeWs = () => {
    ws.send('abort')
    ws.close()
  }

  ws.onmessage = (event) => {
    console.log(`WS msg `, event.data);
    onRecvMsg && onRecvMsg({
      event,
      closeWs,
      data: event.data,
      dataObj: validJson(event.data) ? JSON.parse(event.data) : null,
    })
  };

  onCloseWs && onCloseWs({closeWs})
}
