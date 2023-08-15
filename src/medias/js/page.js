const upEntity = '&#9650;'
const downEntity = '&#9660;'
const sortUp = 'up'
const sortDown = 'down'
const hiddenClassName = 'hidden'
let pressedKeys = []

function searchFocus (params) {
  params = params || {}
  const eInputRef = params.eInput || document.querySelector('.input-search')
  const stOut = setTimeout(() => {
    clearTimeout(stOut)
    eInputRef.focus()
  }, 0)

  if (params.clear) {
    eInputRef.value = ''
  }
}

function handleCursorPlace (evt) {
  const eTarget = evt.target
  const stOut = setTimeout(() => {
    clearTimeout(stOut)
    eTarget.selectionStart = eTarget.selectionEnd = 10000
  }, 0)
}

function handleClearClassnames (qValue, doClearValue) {
  const eClear = document.querySelector('.input-clear')
  const eInputSearch = document.querySelector('.input-search')

  if (qValue) {
    removeClass(eClear, 'hidden')
    searchFocus()
    if (doClearValue) {
      addClass(eClear, 'hidden')
      eInputSearch.value = ''
    }
    return false
  }
  addClass(eClear, 'hidden')
  return true
}

function searchChange () {
  GLOBAL_DEF.filter.query = document.querySelector('#search').value
  const eWatchHistory = document.querySelector('#ckbox-watched')
  const eWatchlist = document.querySelector('#ckbox-watchlist')
  GLOBAL_DEF.filter.watchHistory = eWatchHistory.checked ? 1 : 0
  GLOBAL_DEF.filter.watchlist = eWatchlist.checked ? 1 : 0
  GLOBAL_DEF.filter.sortBy = document.querySelector('.uni-v-sortBy select').value
  GLOBAL_DEF.filter.wholeWord = document.querySelector('#ckbox-strict').checked ? 1 : 0

  const eReverse = document.querySelector('#reverse-order-hdd')
  GLOBAL_DEF.filter.reverseOrder = eReverse.checked ? 1 : 0
  searchFiles({})
  handleSortSign({sortVal: GLOBAL_DEF.filter.sortBy})
  handleGlobalData({doSave: true})
}

function clearFilters () {
  GLOBAL_DEF.pageInfo.num = 1
  GLOBAL_DEF.pageInfo.totalPages = 0
  GLOBAL_DEF.filter = cloneArray(DEFAULT_FILTER)
  GLOBAL_DEF.subCategoryDisplayForFilter = []
  document.querySelector('#search').value = ''
  document.querySelector('#ckbox-watched').checked = false
  document.querySelector('#ckbox-watchlist').checked = false
  document.querySelector('#ckbox-strict').checked = false
  document.querySelector('#reverse-order-hdd').checked = false
  loadCategory()
  loadSubCategory()
  loadDriveLabelElement()
  loadSortOptions()
  handleGlobalData({doSave: true})
  searchFiles()
  handleSelection({onlyHandleHiding: true})
  handleSortSign({sortVal: GLOBAL_DEF.filter.sortBy})
}

function highlight (query) {
  if (!query) return false

  const dItems = document.querySelectorAll('.hdd-item .data-title-value')

  if (dItems) {
    const dItemsList = Array.prototype.map.call(dItems, item => item)

    const queryUp = query.toUpperCase()
    const querySplits = queryUp.split(' ').filter(val => val.trim() !== '');
    const hasQueryValue = (querySplits.length > 0)

    dItemsList.forEach(function (element) {
      const titleOriginal = element.dataset.title;
      const titleOriginalUp = titleOriginal.toUpperCase()
      const matchAll = querySplits.every(val => new RegExp(`${val}`).test(titleOriginalUp));
      const parentNode = findAncestor(element, 'hdd-item')
      const parentNodeClasses = parentNode.className

      if (element.innerHTML !== titleOriginal) {
        element.innerHTML = titleOriginal
      }

      if (!hasQueryValue) {
        if (hasClass(parentNode, hiddenClassName)) {
          removeClass(parentNode, hiddenClassName)
        }
        return
      }

      if (matchAll) {
        let newTitleHtml = titleOriginal;
        let titleList = null

        querySplits.forEach(val => {
          titleList = cloneArray(boldTitleByQuery(val, titleList, newTitleHtml))
        })

        const tHtml = titleList.map(item => {
          return item.needBold ? `<b class='colorStrong'>${item.value}</b>` : item.value
        }).join('')
        element.innerHTML = tHtml

        if (hasClass(parentNode, hiddenClassName)) {
          removeClass(parentNode, hiddenClassName)
        }
      }

      if (!matchAll) {
        if (!hasClass(parentNode, hiddenClassName)) {
          addClass(parentNode, hiddenClassName)
        }
      }
    })
  }
}

function handleLabelOptionsScroll (params) {
  params = params || {}
  const {
    handleScroll, handleFilter, val, assignValue, selectionIndex,
    from, doClose, selectedValue,
  } = params
  // console.log(`???????????????????????????? `, params)
  const eLabelOption = document.querySelector('.select-label-option')
  const isFromInputChange = (from === 'inputChange')
  const isFromKeydown = (from === 'keydown')
  const eLabelOptionsWpR = document.querySelector('.select-label-options-r')
  const eLabelOptionsItems = eLabelOptionsWpR.querySelectorAll('label')
  const eLabelOptionsItemsList = Array.prototype.map.call(eLabelOptionsItems, item => item)
  const eSelectInput = document.querySelector('.label-select-input')
  let labelOptionR = assignValue || eLabelOption.value
  let selectedIndex = 0
  let notHiddenIndex = -1
  let notHiddenKey = -1

  if (assignValue) {
    labelOptionR = assignValue
    eLabelOption.innerHTML = labelOptionR
    eLabelOption.value = labelOptionR
    eLabelOption.selected = true
    GLOBAL_DEF.filter.driveLabel = labelOptionR
  }

  eLabelOptionsItemsList.forEach((eItem, eKey) => {
    const isSelected = hasClass(eItem, 'selected')
    const tVal = eItem.innerHTML.trim()
    const valueToCompare = labelOptionR

    if (tVal === valueToCompare) {

      if (!selectedIndex && !isFromKeydown) {
        selectedIndex = eKey
      }

      if (!isSelected) {
        addClass(eItem, 'selected')
      }
    }
    else {
      isSelected && removeClass(eItem, 'selected')
    }

    if (handleFilter) {
      const fVal = val.trim().toLowerCase()
      const findIt = tVal.toLowerCase().indexOf(fVal) >= 0
      const isHidden = hasClass(eItem, 'hidden')
      !findIt && !isHidden && addClass(eItem, 'hidden')
      findIt && isHidden && removeClass(eItem, 'hidden')
    }

    if (!hasClass(eItem, 'hidden')) {
      notHiddenKey = eKey
      notHiddenIndex++
    }

    hasClass(eItem, 'selection') && removeClass(eItem, 'selection')

    if (Number.isInteger(selectionIndex) && selectionIndex >= 0) {
      const shouldSelect = (notHiddenIndex === selectionIndex)

      if (shouldSelect) {
        selectedIndex = selectionIndex
        addClass(eItem, 'selection')
        const sVal = eLabelOptionsItemsList[notHiddenKey].innerHTML
        eSelectInput.value = sVal

        handleCursorPlace({ target: eSelectInput })
      }

    }
  })
  if (handleScroll) {
    const eSelectedHidden = document.querySelector('.select-label-options-r>label.selected.hidden')

    if (eSelectedHidden && isFromInputChange) {
      selectedIndex = 0
    }
    const tHeight = 29
    const posY = tHeight * selectedIndex
    eLabelOptionsWpR.scrollTo(0, posY)
  }

  if (doClose) {
    handleLabelListClose()
  }
}

function onShowLabelList () {
  const eSelectInput = document.querySelector('.label-select-input')
  const eLabelOptionsWp = document.querySelector('.select-label-options')
  removeClass(eLabelOptionsWp, 'hidden')
  searchFocus({ eInput: eSelectInput })
  handleLabelOptionsScroll({ handleScroll: true })
  addClass(document.querySelector('.select-type-options'), 'hidden')
}

function handleKeyPressing (evt, extra) {
  extra = extra || {}
  const { keyCode } = evt
  const { type } = extra
  const isUp = (type === 'up')
  const isDown = (type === 'down')
  const isTab = (keyCode === 9)
  const isCtrl = (keyCode === 17)
  const inputSearch = document.querySelector('#search')
  const indexOfKc = pressedKeys.indexOf(keyCode)
  const findKc = (indexOfKc >= 0)
  const pressedKeysClone = [...pressedKeys]
  // console.log(keyCode)
  const keyPairsActions = {
    clear: {
      keys: [17, 67],
      action: () => {
        inputSearch.value = ''
        searchFocus()
      }
    },
    focus: {
      keys: [9],
      action: searchFocus,
    },
    showLabelList: {
      keys: [16, 17, 76],
      action: onShowLabelList,
    }
  }
  const findPairKey = Object.keys(keyPairsActions).filter(item => keyPairsActions[item].keys.sortByNum().join(',') === pressedKeys.sortByNum().join(','))
  const tPair = findPairKey.length ? keyPairsActions[findPairKey[0]] : null

  if (isUp) {
    findKc && pressedKeys.splice(indexOfKc, 1)
    tPair && tPair.action()
  }

  if (isDown) {
    !findKc && pressedKeys.push(keyCode)
  }

  // console.log(keyCode, tPair, pressedKeysClone)
}

function handleLabelListClose () {
  const eSelectInput = document.querySelector('.label-select-input')
  const eLabelOptionsWp = document.querySelector('.select-label-options')
  eSelectInput.value = ''
  addClass(eLabelOptionsWp, 'hidden')
  handleLabelOptionsScroll({ handleFilter: true, val: '' })
}


function handleDriveLabelEvent () {
  const eSelect = document.querySelector('#label-select')
  const eSelectLabelHeader = document.querySelector('.label-select-header')
  const eSelectInput = document.querySelector('.label-select-input')
  const eLabelOptionsWp = document.querySelector('.select-label-options')
  const eLabelOptionsWpR = document.querySelector('.select-label-options-r')

  eSelectLabelHeader.addEventListener('click', evt => {
    evt.stopPropagation()
    if (hasClass(eLabelOptionsWp, 'hidden')) {
      onShowLabelList()
      return
    }
    handleLabelListClose()
  })
  eSelectInput.addEventListener('input', (e) => {
    const tVal = e.srcElement.value

    let pVal = tVal

    if (tVal.length < 2) {
      pVal = ''
    }

    handleLabelOptionsScroll({
      handleFilter: true,
      val: pVal,
      selectionIndex: -2,
      handleScroll: true,
      from: 'inputChange'
    })
  })
  eSelectInput.addEventListener('keydown', e => {
    const { keyCode } = e
    const isUp = (keyCode === 38)
    const isDown = (keyCode === 40)
    const isEnter = (keyCode === 13)
    const eLabelOptionsItems = eLabelOptionsWpR.querySelectorAll('label')
    const eLabelOptionsItemsList = Array.prototype.map.call(eLabelOptionsItems, item => item)
    const eListFiltered = eLabelOptionsItemsList.filter(eItem => !hasClass(eItem, 'hidden'))
    const selectionIndex =  eListFiltered.findIndex(eItem => hasClass(eItem, 'selection'))
    const selectedIndex = eListFiltered.findIndex(eItem => hasClass(eItem, 'selected'))
    let currentIndex = (selectionIndex >= 0) ? selectionIndex : selectedIndex
    let newIndex = currentIndex

    if (isEnter && selectionIndex >= 0) {
      handleLabelOptionsScroll({
        assignValue: eSelectInput.value,
        doClose: true,
      })
      return
    }

    if (!isUp && !isDown) return false

    if (isUp && currentIndex !== 0) {
      newIndex--
    }

    if (isDown && currentIndex !== eListFiltered.length - 1) {
      newIndex++
    }

    if (selectionIndex < 0 && selectedIndex < 0) {
      newIndex = 0
    }

    handleLabelOptionsScroll({
      selectionIndex: newIndex,
      handleScroll: true,
      from: 'keydown',
    })
  })
  eSelect.addEventListener('mousedown', (e) => {
    e.preventDefault()
  })
  eLabelOptionsWpR.addEventListener('click', e => {
    const isLabel = hasClass(e.target, 'select-label-option-value')

    if (!isLabel) return false

    const labelValue = e.target.innerHTML.trim()

    handleLabelOptionsScroll({
      assignValue: labelValue,
      handleFilter: true,
      val: ''
    })
    handleLabelListClose()
  })
}

function handleQueryInputEvents () {
  const eInputSearch = document.querySelector('.input-search')

  eInputSearch.addEventListener('input', (e) => handleClearClassnames(e.srcElement.value))
  eInputSearch.addEventListener('keyup', evt => {
    const isEnterKey = (evt.keyCode === 13)
    return isEnterKey && searchChange()
  })
  eInputSearch.addEventListener('focus', evt => {
    handleCursorPlace(evt,this)
    addClass(eInputSearch, 'uni-wave')
    handleClearClassnames(evt.target.value)
  })
  eInputSearch.addEventListener('blur', evt => {
    removeClass(eInputSearch, 'uni-wave')
  })
}

function dataItemEvents () {
  const dataItemsList = Array.from(document.querySelectorAll('.hdd-item'))
  dataItemsList.forEach(eItem => {
    const iconWatch = eItem.querySelector('.action-watched')
    const iconSchedule = eItem.querySelector('.action-schedule')
    const aIndex = eItem.dataset.index
    const itemJsonData = getItemData(aIndex).itemJson
    if (itemJsonData) {
      const wValue = itemJsonData.watch ? (itemJsonData.watch - 1) : 0
      eItem.setAttribute('data-watching', wValue)
      if (wValue) {handleWatchingMedals({eItem, num: wValue})}
      if (wValue >= 1) {
        removeClass(eItem.querySelector('.action-schedule'), 'visHidden')
      }
      if (itemJsonData.watched) {
        removeClass(eItem.querySelector('.action-watched'), 'visHidden')
      }
    }
    initDataItemElementEvent({eItem, aIndex})
    initActionWatchEvent({imgEl: iconWatch, aIndex})
    initActionScheduleEvent({imgEl: iconSchedule, aIndex})
  })
}
function addVideoInfo () {
  const eVideoInfo = document.querySelector('#videoInfo')
  if (eVideoInfo) {
    const vInfoData = eVideoInfo.dataset.info
    try {
      const pList = JSON.parse(vInfoData)
      GLOBAL_DEF.videoInfo.push(...pList)
    }
    catch (err) {console.error('videoInfo::::::::', err)}
    const hddItems = Array.from(document.querySelectorAll('.row.hdd-item'))
    for (const divItem of hddItems) {

      try {
        const jsonData = JSON.parse(divItem.dataset.item)
        const vIds = jsonData.videos && jsonData.videos.split(',') || []
        const vInfo = GLOBAL_DEF.videoInfo.filter(info => vIds.includes(info.mediaid))

        if (vInfo.length) {
          for (const vInfoItem of vInfo) {
            handleVideoInfoElement({rootEl: divItem, vInfo: vInfoItem})
          }
        }
      }
      catch (err) {console.error('addVideoInfo::::::::', err)}
    }
  }
}

function addCategoryListeners (params) {
  const {clsName = 'uni-v-category', subClsName = 'uni-v-subCategory', dataObj, onEvtChange} = params || {}
  const categoryEl = document.querySelector(`.${clsName}`)
  const sCategoryEl = document.querySelector(`.${subClsName}`)

  if (categoryEl) {
    categoryEl.addEventListener('change', () => {
      const val = event.target.value
      onEvtChange ? onEvtChange({catId: Number(val)}) : onFilterCategoryChange({catId: Number(val), dataObj})
    })
  }
  if (sCategoryEl) {
    sCategoryEl.addEventListener('change', () => {
      const val = event.target.value
      onEvtChange ? onEvtChange({subCatId: Number(val)}) :
      onFilterCategoryChange({subCatId: Number(val), dataObj})
    })
  }
}
function onPageSizeChange () {
  const val = event.target.value
  GLOBAL_DEF.pageInfo.limit = Number(val)
  handleGlobalData({doSave: true})
  handleToast({msg: LNG.upSuccessfully, showToast: true})
}
function watchVideoRelatedEvents () {
  const eWatchHistory = document.querySelector('#ckbox-watched')
  const eWatchlist = document.querySelector('#ckbox-watchlist')
  if (eWatchHistory) {
    eWatchHistory.addEventListener('change', evt => {
      const checked = evt.target.checked
      if (checked) {
        eWatchlist.checked = false
      }
    })
  }
  if (eWatchlist) {
    eWatchlist.addEventListener('change', evt => {
      const checked = evt.target.checked
      if (checked) {
        eWatchHistory.checked = false
      }
    })
  }
  const eRange = document.querySelector('#watch-status')
  eRange.addEventListener('change', evt => {
    const value = evt.target.value
    upWatchingFeeling(value)
  })
  const btnSubmittingWatching = document.querySelector('.btnSubmit.watching')
  if (btnSubmittingWatching) {
    btnSubmittingWatching.addEventListener('click', evt => {
      const itemData = GLOBAL_DEF.watchingItem
      if (itemData && GLOBAL_DEF.watchingElementIndex) {
        const watchingVal = itemData.watch
        const eItem = document.querySelector(`.row.hdd-item[data-index="${GLOBAL_DEF.watchingElementIndex}"]`)
        upWatchingStatus({
          itemJson: itemData, nWatch: watchingVal,
          changingStatus: true,
          eItem,
          iconSchedule: eItem.querySelector('.action-schedule')
        })
      }
      else {
        console.warn(`ERRRRRRRRRRRRR btnSubmittingWatching`)
      }
    })
  }
  const elScheduleOverlay = document.querySelector('.watch-status-overlay')
  elScheduleOverlay.addEventListener('click', evt => {
    onHideWatchingModal()
  })
}

function addHeaderProp () {
  const wrapper = document.querySelector('.row-prop')
  const oCategory = {prop: 'catName', label: LNG.category}
  const oPath = {prop: 'filepath', label: LNG.filepath}
  const options = [...getSortByOptions()]
  options.splice(1, 0, oCategory)
  options.push(oPath)
  wrapper.innerHTML = ''
  for (const item of options) {
    const itemWp = document.createElement('div')
    itemWp.className = 'hdd-prop-wrapper'
    itemWp.dataset.prop = item.prop

    const itemLabel = document.createElement('span')
    itemLabel.className = 'hdd-prop'
    itemLabel.textContent = item.label

    itemWp.appendChild(itemLabel)
    wrapper.appendChild(itemWp)
  }
}

function handleSortSign (params) {
  const {init, sortVal, checked} = params || {}

  if (typeof sortVal !== 'undefined' && sortVal !== null) {
    render({prop: sortVal})
  }

  function render ({prop}) {
    const eSortBy = document.querySelector(`.hdd-prop-wrapper .sortBy-sign`)
    if (eSortBy) {
      eSortBy.parentNode.removeChild(eSortBy)
    }
    const wp = document.querySelector(`.hdd-prop-wrapper[data-prop=${prop}]`)
    const cK =  document.querySelector('#reverse-order-hdd')
    const reversed = checked || cK.checked
    if (checked) {
      cK.checked = true
    }
    if (wp) {
      const sBy = document.createElement('span')
      sBy.className = 'sortBy-sign'
      sBy.innerHTML = reversed ? downEntity : upEntity
      wp.appendChild(sBy)
    }
  }
}

function fixHeaderPropsBarStyle () {
  const hEl = document.querySelector('.row.row-prop')
  const hElStyle = hEl.currentStyle || window.getComputedStyle(hEl)
  let hPadRight = hEl.dataset.padright || hElStyle.paddingRight

  if (hPadRight) {
    hPadRight = Number(hPadRight.replace('px', ''))

    if (hPadRight && !hEl.dataset.padright) {
      hEl.setAttribute('data-padRight', hPadRight)
    }
  }

  const oNum = Number(hEl.dataset.padright)
  const vPad = scrollbarVisible(document.querySelector('.row-wrapper')) ? 15 : 0
  hEl.style.paddingRight = oNum + vPad + 'px'
}

function handleSelection (params) {
  const {onlyHandleHiding} = params || {}
  const root = document.querySelector('.hdd-item-selection-v')
  const items = Array.from(document.querySelectorAll('.row.hdd-item .hdd-itemSelection-item'))
  const ctrl = document.querySelector('.hdd-itemSelection-all')
  const displayVal = Number(root.dataset.display) === 1 ? 0 : 1
  const toShow = displayVal === 1
  if (!items.length && toShow && !onlyHandleHiding) {
    return handleToast({msg: LNG.noItems, showToast: true})
  }

  const label = document.querySelector('.hdd-item-selection-v>span')

  if (!toShow || !onlyHandleHiding) {
    root.setAttribute('data-display', displayVal)
    label.textContent = toShow ? 'Hide selection' : 'Select'
  }

  let ckBox
  if (!toShow) {
    addClass(ctrl, 'hidden')
    ctrl.checked = false
    items.forEach(item => item.checked = false)
    handleMoreActionRender()
  }
  if (onlyHandleHiding) return false
  if (toShow) {
    removeClass(ctrl, 'hidden')
    ckBox = document.createElement('input')
    ckBox.className = 'hdd-itemSelection-item ckbox-square'
    ckBox.type = 'checkbox'
  }

  for (const item of items) {
    if (toShow) {
      removeClass(item, 'hidden')
    }
    else {
      addClass(item, 'hidden')
    }
  }
}

function searchFiles (params) {
  const {page, extraParams, onUp} = params || {}
  const {doClear} = extraParams || {}
  const urlParams = cloneArray(GLOBAL_DEF.filter)
  removeInvalidKeys(urlParams)
  urlParams.page = Number(page || 1)
  if (urlParams.driveLabel && urlParams.driveLabel.toLowerCase() === 'all') {
    urlParams.driveLabel = ''
  }
  if (urlParams.category) {
    urlParams.catId = urlParams.category.id
    delete urlParams.category
  }
  if (urlParams.subCategory) {
    urlParams.subCatId = urlParams.subCategory.id
    delete urlParams.subCategory
  }
  const isFirstP = urlParams.page === 1
  urlParams.limit = GLOBAL_DEF.pageInfo.limit
  apiRequest({
    uri: apiUris.searchFile,
    urlParams,
    onData (res) {
      const oWrapper = document.querySelector('.row-wrapper')
      if (doClear) {
        oWrapper.innerHTML = ''
      }
      if (res) {
        GLOBAL_DEF.pageInfo.num = urlParams.page
        if (res.pageInfo) {
          if (res.pageInfo.totalPage) {
            GLOBAL_DEF.pageInfo.totalPages = res.pageInfo.totalPage
          }
        }
        if (isFirstP) {
          oWrapper.innerHTML = ''
        }
        if (res.files) {
          const eleLen = Array.from(document.querySelectorAll('.row-wrapper .row.hdd-item')).length
          for (let i = 0; i < res.files.length; i++) {
            appendElementDataItem({jsonData: res.files[i], index: eleLen + i + 1})
          }
        }
        handlePager({})
      }

      if (GLOBAL_DEF.filter.query) {
        highlight(GLOBAL_DEF.filter.query)
      }

      fixHeaderPropsBarStyle()
      onUp && onUp()
    }

  })
}

function fixDocTitle () {
  document.title = LNG.docTitle
}
function loadServerConfig () {
  const el = document.querySelector('#serverConfCont')
  const conf = el && el.dataset.conf
  if (validJson(conf)) {
    Object.assign(GLOBAL_DEF.serverConf, JSON.parse(conf))
  }
  const allOptWp = document.querySelectorAll('.select-label-options-r')
  Array.from(allOptWp).forEach(el => {
    el.style.maxHeight = window.innerHeight * 0.6 + 'px'
  })
}
function fixProxyElPlaceholder () {
  const pClass = 'st-proxy'
  const eInput = document.querySelector('.st-proxy .st-data-row-item-input')
  eInput.textContent = GLOBAL_DEF.proxy
  onSetPlaceholderForContentEditableElement({
    pClass, eInput,
    placeholder: LNG.setProxyTip
  })
}
function setBtnToggleSearchBg () {
  const items = [
    {dir: 'up', title: LNG.hideSearchPanel},
    {dir: 'down', title: LNG.showSearchPanel},
  ]
  for (const pItem of items) {
    const eItem = document.querySelector(`.btnUpSearchPanel[data-dir=${pItem.dir}]`)

    if (eItem) {
      eItem.style.backgroundImage = `url("./medias/img/chevron-${pItem.dir}.png")`
      eItem.title = pItem.title
      eItem.addEventListener('click', () => {
        toggleSearchPanel({dir: pItem.dir})
      })
    }
  }
}
function toggleSearchPanel ({dir}) {
  const isDown = dir === 'down'
  const eDown = document.querySelector(`.btnUpSearchPanel[data-dir="down"]`)
  const eHeader = document.querySelector('.list-head')
  const eBg = document.querySelector('.h-bg')
  if (eDown) {
    eDown.style.display = isDown ? 'none' : 'flex'
    eHeader.classList.add('hideEl')
  }
  console.log(`toggleSearchPanel `, eHeader)
  eHeader.style.maxHeight = isDown ? 'none' : 0
  eBg.style.top = `${eHeader.clientHeight}px`
  eHeader.classList.remove('hideEl')
}
window.onload = () => {
  handleGlobalData({doGet: true})
  loadServerConfig()

  document.body.addEventListener('click', (e) => {
    if (document.querySelector('.select-label-options').contains(e.target)) {
      return false
    }

    if (!hasClass(document.querySelector('.select-label-options'), 'hidden')) {
      handleLabelListClose()
    }
  })
  Array.prototype.sortByNum = function () {
    return this.sort((a, b) => a - b)
  }
  window.addEventListener('keydown', evt => {
    handleKeyPressing(evt, { type: 'down' })
  })
  window.addEventListener('keyup', evt => {
    handleKeyPressing(evt, { type: 'up' })
  })
  window.addEventListener('blur', evt => {
    pressedKeys = []
  })
  getConfig({
    onSuccessUp () {
      console.log(`GLOBAL_DEF `, GLOBAL_DEF)
      fixDocTitle()
      addHeaderProp()
      setBtnToggleSearchBg()
      fixProxyElPlaceholder()
      addCategoryListeners()
      handleQueryInputEvents()
      handleDriveLabelEvent()
      watchVideoRelatedEvents()

      syncSelectedCategory()
      if (GLOBAL_DEF.categories.length) {
        loadCategory()
      }
      if (GLOBAL_DEF.subCategoryDisplayForFilter.length) {
        loadSubCategory()
      }
      
      onModalLoad()
      addVideoInfo()
      fixHBg()
      handlePager({initLoad: true})
      loadSortOptions()
      loadLanguageOptions()
      loadPageSizeOptions()
      loadCategory()
      onFilterCategoryChange({})
      loadDriveLabelElement()
      handleSortSign({sortVal: GLOBAL_DEF.filter.sortBy, checked: GLOBAL_DEF.filter.reverseOrder})
      searchFiles()
      assignLocale()
      console.log(`GLOBAL_DEF ---------------------------- `, GLOBAL_DEF)
    }
  })
}
