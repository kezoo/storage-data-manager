function loadCategory () {
  loadElementOptions({
    wrapperCls: 'uni-v-category',
    gOptionProp: 'categories',
    defOption: DEF_CATEGORY_ITEM(),
    defaultVal: GLOBAL_DEF.filter.category && GLOBAL_DEF.filter.category.id,
  })
}

function loadSubCategory () {
  loadElementOptions({
    wrapperCls: 'uni-v-subCategory',
    gOptionProp: 'subCategoryDisplayForFilter',
    defOption: DEF_CATEGORY_ITEM(),
    defaultVal: GLOBAL_DEF.filter.subCategory && GLOBAL_DEF.filter.subCategory.id,
  })
}

function loadSortOptions () {
  const sortList = [
    {prop: 'newest', label: LNG.newest},
    ...getSortByOptions()
  ]
  loadElementOptions({
    wrapperCls: 'uni-v-sortBy',
    optionsData: sortList,
    defaultVal: GLOBAL_DEF.filter.sortBy,
    optionDisplayProp: 'label',
    optionProp: 'prop',
  })
}

function loadPageSizeOptions () {
  console.log(`loadPageSizeOptions         `, GLOBAL_DEF.pageSizeOptions)
  loadElementOptions({
    wrapperCls: 'st-pageSize',
    optionsData: GLOBAL_DEF.pageSizeOptions,
    defaultVal: GLOBAL_DEF.pageInfo.limit
  })
}
function loadLanguageOptions () {
  loadElementOptions({
    wrapperCls: 'st-selectLanguage',
    optionsData: GLOBAL_DEF.availableLocales,
    defaultVal: GLOBAL_DEF.locale,
  })
}
function loadElementOptions ({wrapperCls, optionsData, gOptionProp, optionProp, optionDisplayProp, defaultVal, defOption, pushDefOpt}) {
  const wp = document.querySelector(`.${wrapperCls}`)

  if (!wp) {
    console.warn(`loadElementOptions CANNOT find element: `, wrapperCls)
    return false
  }

  const eSelect = wp.querySelector('.st-data-select')
  let optionList = optionsData || GLOBAL_DEF[gOptionProp]
  const hasData = Array.isArray(optionList) && optionList.length > 0

  optionList = hasData ? cloneArray(optionList) : []

  if (defOption) {
    const findIt = optionList.find(oP => oP.id === defOption.id)
    !findIt && (pushDefOpt ? optionList.push(defOption) : optionList.unshift(defOption))
  }

  const optionPropName = optionProp || 'id'
  const oDisplayProp = optionDisplayProp || 'name'
  eSelect.innerHTML = ''
  if (hasData) {
    removeClass(wp, 'hidden')
    for (const option of optionList) {
      const isObj = typeof option === 'object'
      const oEl = document.createElement('option')
      const oVal = isObj ? option[optionPropName] : option
      oEl.value = oVal || ''
      const displayVal = isObj ? option[oDisplayProp] : option
      oEl.textContent = displayVal || ''

      if (defaultVal === oVal) {
        oEl.selected = true
      }
      eSelect.appendChild(oEl)
    }
  }

  if (!hasData) {
    addClass(wp, 'hidden')
  }
}

function loadDriveLabelElement () {
  const dEl = document.querySelector('.uni-v-driveLabels')
  const labelListEl = document.querySelector('.select-label-options-r')
  const nSel = document.querySelector('#label-select')
  const nOpt = document.querySelector('.select-label-option')
  const oVal = GLOBAL_DEF.filter.driveLabel || 'All'
  if (GLOBAL_DEF.driveLabels.length) {
    labelListEl.innerHTML = ''
    nOpt.textContent = oVal
    nOpt.value = oVal
    nSel.value = oVal
    nSel.setAttribute('data-label', oVal)

    const options = ['All', ...GLOBAL_DEF.driveLabels]
    removeClass(dEl, 'hidden')
    for (const opt of options) {
      const nLabel = document.createElement('label')
      nLabel.className = 'select-label-option-value'
      nLabel.textContent = opt
      labelListEl.appendChild(nLabel)
    }

  }
}

function handleVideoInfoElement ({rootEl, vInfo}) {
  const divName = rootEl.querySelector('.data-name')
  const vSummary = document.createElement('div')
  vSummary.dataset.mediaid = vInfo.mediaid
  vSummary.className = 'v-summary'
  const itemClasses = 'v-summary-item'

  const vSummarySide = document.createElement('div')
  vSummarySide.className = itemClasses + ' v-summary-side'

  const vSummaryOName = document.createElement('div')
  vSummaryOName.className = itemClasses + ' v-summary-name-o'

  const vSummaryName = document.createElement('div')
  vSummaryName.className = itemClasses + ' v-summary-name'

  const vSummaryCover = document.createElement('img')
  vSummaryCover.className = itemClasses + ' v-summary-cover'

  const vSummaryCList = document.createElement('div')
  vSummaryCList.className = itemClasses + ' v-summary-countries'

  let oTitle = vInfo.original_title || ''
  let nTitle = oTitle
  let countries = ''
  const details = vInfo.detail && JSON.parse(vInfo.detail)
  const sPics = validJson(vInfo.stored_pics) ? JSON.parse(vInfo.stored_pics) : {}
  if (details) {
    // console.log('DETAILS:::::::', details)
    oTitle = details.original_title || oTitle
    nTitle = details.title || nTitle
    coverUrl = getCoverUrl(sPics, details.poster_path)
    countries = details.production_countries && details.production_countries.map(pItem => pItem.name).join(', ')
  }

  divName.appendChild(vSummary)
  if (vInfo.coverUrl) {
    vSummaryCover.src = vInfo.coverUrl
    vSummaryCover.width = 60
    vSummary.appendChild(vSummaryCover)
  }
  vSummary.appendChild(vSummarySide)
  if (oTitle) {
    vSummaryOName.innerHTML = oTitle
    vSummarySide.appendChild(vSummaryOName)
  }
  if (nTitle && nTitle !== oTitle) {
    vSummaryName.innerHTML = nTitle
    vSummarySide.appendChild(vSummaryName)
  }
  if (countries) {
    vSummaryCList.innerHTML = countries
    vSummarySide.appendChild(vSummaryCList)
  }
}

function fixHBg () {
  const header = document.querySelector('.list-head')
  const headerHeight = header.clientHeight

  const eBg = document.querySelector('.h-bg')
  eBg.style.backgroundImage = 'url(./medias/img/bg.jpg)'
  eBg.style.top = `${headerHeight}px`
}

function renderReplacingCategory ({msgWp, categories, isSub, msgTitle, hideSubTitle}) {
  const dataObj = {
    categories, subCategoryDisplayForFilter: [],
    filter: {category: null, subCategory: null}
  }
  const cName = isSub ? 'sub-category' : 'category'
  const headerWp = document.createElement('div')
  headerWp.className = 'rep-header-wp'
  const header = document.createElement('div')
  header.className = 'rep-header-t'
  header.textContent = msgTitle || LNG.categoryTryingToDel

  if (!hideSubTitle) {
    const hF = document.createElement('div')
    hF.className = 'rep-header-side'
    hF.textContent = LNG.replaceItWithNew
    headerWp.appendChild(header)
    headerWp.appendChild(hF)
    msgWp.appendChild(headerWp)
  }

  const eC = document.createElement('div')
  const cCls = `rep-category`
  eC.className = `uni-verticalU-wrapper ${cCls}`

  const cLabel = document.createElement('div')
  cLabel.className = 'uni-verticalU-label'
  cLabel.textContent = LNG.category

  const cSel = document.createElement('select')
  cSel.className = 'st-data-select'

  eC.appendChild(cLabel)
  eC.appendChild(cSel)
  msgWp.appendChild(eC)

  const eS = document.createElement('div')
  const sCls = `rep-subCategory`
  eS.className = `uni-verticalU-wrapper hidden ${sCls}`

  const sLabel = document.createElement('div')
  sLabel.className = 'uni-verticalU-label'
  sLabel.textContent = LNG.subCategory

  const sSel = document.createElement('select')
  sSel.className = 'st-data-select'

  eS.appendChild(sLabel)
  eS.appendChild(sSel)
  msgWp.appendChild(eS)

  loadElementOptions({
    wrapperCls: cCls,
    optionsData: categories,
    defOption: DEF_CATEGORY_ITEM(),
    pushDefOpt: true,
  })
  const loadSub = () => loadElementOptions({
    wrapperCls: sCls,
    optionsData: dataObj.subCategoryDisplayForFilter,
    defOption: DEF_CATEGORY_ITEM(),
    pushDefOpt: true,
  })
  if (categories[0] && categories[0].subCategories && categories[0].subCategories.length) {
    onFilterCategoryChange({catId: categories[0].id, dataObj, loadSubCategoryFn: loadSub})
  }
  GLOBAL_DEF.replacingCategoryParams = {
    catId: categories[0].id,
  }
  if (dataObj.filter.subCategory && dataObj.filter.subCategory.id) {
    GLOBAL_DEF.replacingCategoryParams.subCatId = dataObj.filter.subCategory.id
  }
  addCategoryListeners({
    clsName: cCls, subClsName: sCls,
    dataObj,
    onEvtChange (vParams) {
      Object.assign(GLOBAL_DEF.replacingCategoryParams, vParams)

      onFilterCategoryChange({
        ...vParams,
        dataObj,
        loadSubCategoryFn: loadSub
      })
      GLOBAL_DEF.replacingCategoryParams.subCatId = dataObj.filter.subCategory && dataObj.filter.subCategory.id || null
      if (GLOBAL_DEF.replacingCategoryParams.catId < 0) {
        GLOBAL_DEF.replacingCategoryParams.subCatId = null
      }
    }
  })
}
