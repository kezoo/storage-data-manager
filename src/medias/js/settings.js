function getConfig (params) {
  const {onSuccessUp} = params || {}
  apiRequest({
    uri: `/config`,
    onData (data) {
      const {toUp, localeData, locales, isClearingCacheAvailable} = data
      if (localeData) {
        Object.assign(LNG, localeData)
      }
      if (locales) {
        GLOBAL_DEF.availableLocales = locales
      }
      if (!Object.keys(LNG).length) {
        return popBox({
          msg: 'Failed to initialize App, please reload and try again.',
          onOk () {
            getConfig(params)
          }
        })
      }
      GLOBAL_DEF.configInit = 1
      toUp && Object.assign(GLOBAL_DEF, toUp)
      if (isClearingCacheAvailable) {
        removeClass(document.querySelector('.st-clearCache'), 'hidden')
      }

      try {
        onSuccessUp && onSuccessUp()
      }
      catch (err) {
        console.error(`INIT CONFIG Error: `, err)
      }

    }
  })
}
function openSettings () {
  if (!GLOBAL_DEF.configInit) {
    handleToast({msg: LNG.notInitializedProperly, showToast: true})
    return getConfig()
  }
  const sContainer = document.querySelector('.settings-container')
  sContainer.style.maxHeight = document.body.clientHeight * 0.7
  if (GLOBAL_DEF.categories.length) {
    const eCatItems = document.querySelectorAll('.st-category-list>.st-data-row-item')

    if (eCatItems.length) {
      for (const eItem of eCatItems) {
        if (eItem.dataset.id) {
          eItem.parentNode.removeChild(eItem)
        }
      }
    }
    for (const eItem of GLOBAL_DEF.categories) {
      addCategory({ignoreEmpty: true, moreProps: {
        id: eItem.id, name: eItem.name, type: eItem.type, usePrepend: true,
        subRow: {
          label: LNG.subCategory,
          labelAdding: LNG.Add,
          subItems: eItem.subCategories
        }
      }})
    }
  }

  handleModalStyle('settings', 'open')
  if (!document.querySelector('.st-collection-symbol .qMark-gp')) {
    addQuestionMark({el: document.querySelector('.st-collection-symbol .label-set'), msg: LNG.collectionSymbolQA})
  }

  document.querySelector('.st-collection-symbol-list').innerHTML = ''
  for (const dPath of GLOBAL_DEF.collectionSymbol) {
    addCollectionSymbol({val: dPath.name, id: dPath.id})
  }

  if (!document.querySelector('.st-path-deepScan .qMark-gp')) {
    addQuestionMark({el: document.querySelector('.st-path-deepScan .label-set'), msg: LNG.deepScanQA})
  }

  document.querySelector('.st-path-deepScan-list').innerHTML = ''
  for (const dPath of GLOBAL_DEF.deepScanPath) {
    addDeepScanPath({val: dPath.name, id: dPath.id})
  }

  if (!document.querySelector('.st-file-exclusion .qMark-gp')) {
    addQuestionMark({el: document.querySelector('.st-file-exclusion .label-set'), msg: LNG.fileExclusionQA})
  }

  if (!document.querySelector('.st-formatFileName .qMark-gp')) {
    addQuestionMark({el: document.querySelector('.st-formatFileName .label-set'), msg: LNG.formatFileNameTip})
  }

  document.querySelector('.st-formatFileName-list').innerHTML = ''
  for (const sFormatName of GLOBAL_DEF.formatFileName) {
    formatFileName({val: sFormatName.name, id: sFormatName.id})
  }

  document.querySelector('#clearDataBeforeAdding').checked = !!GLOBAL_DEF.clearDataBeforeAdding
  document.querySelector('#keepWatched').checked = !!GLOBAL_DEF.keepThoseWatchedVideos
  onShowKeepWatchedInput(GLOBAL_DEF.clearDataBeforeAdding)

  document.querySelector('.st-file-exclusion-list').innerHTML = ''
  for (const dPath of GLOBAL_DEF.fileExclusion) {
    addFileExclusion({val: dPath.name, id: dPath.id})
  }
  if (GLOBAL_DEF.potentialDup) {
    document.querySelector('.sel-pDup').value = GLOBAL_DEF.potentialDup
  }
  document.querySelector('.st-tmdb-token-input').textContent = GLOBAL_DEF.tmdbKey || ''

  if (!document.querySelector('.st-tmdb-token .qMark-gp')) {
    addQuestionMark({el: document.querySelector('.st-tmdb-token .label-set'), msg: LNG.tmdbApiKeyTip})
  }
}

function addQuestionMark ({el, msg}) {
  const qMark = document.createElement('img')
  qMark.src = './medias/img/question.png'
  qMark.className = 'qMark-gp'
  qMark.addEventListener('click', () => {
    popBox({
      msg,
    })
  })
  el.appendChild(qMark)

}

function handlePlaceholderForContentEditable ({el, placeholder, pClass, doRemove, isFocus}) {
  const eParent = findAncestor(el, pClass)

  if (isFocus) {
    if (hasClass(eParent, 'empty-warning')) {
      removeClass(eParent, 'empty-warning')
    }
  }
  if (!el.textContent && placeholder) {
    el.textContent = placeholder
    addClass(eParent, 'st-empty')
  }
  if (doRemove) {
    if (hasClass(eParent, 'st-empty')) {
      removeClass(eParent, 'st-empty')
      el.textContent = ''
    }
  }
}
function onSetPlaceholderForContentEditableElement ({placeholder, eInput, onFocus, onBlur, pClass}) {
  const tPlaceholder = placeholder || LNG.enterValueHere
  handlePlaceholderForContentEditable({el: eInput, placeholder: tPlaceholder, pClass})

  eInput.addEventListener('focus', () => {
    handlePlaceholderForContentEditable({el: eInput, doRemove: true, pClass, isFocus: true})
    onFocus && onFocus()
  })
  eInput.addEventListener('blur', () => {
    handlePlaceholderForContentEditable({el: eInput, placeholder: tPlaceholder, pClass})
    onBlur && onBlur()
  })
}
function addDataRow ({eParent, notEditable, id, placeholder, requireType, prop, name, type, usePrepend, subRow}) {
  const eItem = document.createElement('div')
  const pClass = 'st-data-row-item'
  eItem.className = pClass
  if (id) {
    eItem.dataset.id = id
  }

  const eInput = document.createElement('span')
  eInput.className = 'st-data-row-item-input input-gp'
  eInput.contentEditable = notEditable ? false : true
  eInput.setAttribute('role', 'textbox')

  if (name) {
    eInput.textContent = name
  }

  if (notEditable) {
    eItem.className += ' not-editable'
  }

  usePrepend ? eParent.prepend(eItem) : eParent.appendChild(eItem)
  eItem.appendChild(eInput)

  if (requireType) {
    const eType = document.createElement('div')
    eType.className = 'st-dataType'

    const eSelLabel = document.createElement('span')
    eSelLabel.className = 'st-dataType-label'
    eSelLabel.innerHTML = LNG['Data Type']
    eType.appendChild(eSelLabel)

    const eSelect = document.createElement('select')
    eSelect.className = 'st-data-select'
    eSelect.name = 'dataType'

    if (GLOBAL_DEF.dataTypes.length) {
      for (const oItem of GLOBAL_DEF.dataTypes) {
        const eOption = document.createElement('option')
        eOption.value = oItem.id
        eOption.innerHTML = oItem.title
        eSelect.appendChild(eOption)
        if (type && oItem.id === type) {
          eOption.selected = true
        }
      }
      eType.appendChild(eSelect)
      eItem.appendChild(eType)
    }
  }

  const eSubmit = document.createElement('img')
  eSubmit.src = './medias/img/up.png'
  eSubmit.className = 'st-data-row-item-up'
  eSubmit.title = LNG.Submit
  eItem.appendChild(eSubmit)

  eSubmit.addEventListener('click', () => {
    const tParent = findAncestor(eSubmit, 'st-data-row-item')
    const useId = id || tParent.dataset.id
    const tInput = tParent.querySelector('.st-data-row-item-input')
    const isEmpty = hasClass(tParent, 'st-empty') || !tInput.textContent
    if (isEmpty) {
      return handleToast({msg: LNG.enterValueForSubmitting, showToast: true})
    }
    upDataType({
      id: useId,
      dataTypeId: eItem.querySelector('.st-data-select').value,
      name: tInput.textContent,
      prop,
      onSuccess (sData) {
        if (sData.id) {
          eItem.setAttribute('data-id', sData.id)
        }
        syncGlobalData({
          addItem: useId ? null : sData,
          upItem: useId ? sData : null,
        })
        if (!useId) {
          renderSubRow({
            subRow: {
              label: LNG.subCategory,
              labelAdding: LNG.Add,
              subItems: [],
            },
            eItem,
          })
        }
      }
    })
  })

  if (!notEditable) {
    const eRemove = document.createElement('img')
    eRemove.src = './medias/img/delete.png'
    eRemove.className = 'st-data-row-item-remove'
    eRemove.title = LNG.delete
    eItem.appendChild(eRemove)

    eRemove.addEventListener('click', () => {
      const eP = findAncestor(eRemove, pClass)
      const pId = eP.dataset.id
      if (!pId) {
        eItem.parentNode.removeChild(eItem)
      }
      else {
        upDataType({
          id: pId, doRemove: true, prop: 'category',
          onSuccess () {
            syncGlobalData({removeId: pId})
            eItem.parentNode.removeChild(eItem)
          }
        })
      }
    })
  }

  renderSubRow({subRow, eItem})
  onSetPlaceholderForContentEditableElement({
    pClass, eInput,
    onBlur () {
      if (onFindEmpty({thisEl: eInput, oVal: name})) {
        return false
      }
    }
  })
}

function onFindEmpty ({inputClassName, thisEl, oVal}) {
  const isEmpty = (mEl) => hasClass(mEl.parentNode, 'st-empty') || mEl.textContent.trim() === ''
  const findEmpty = thisEl ? isEmpty(thisEl) : Array.from(document.querySelectorAll(inputClassName)).find(fEl => {
    return isEmpty(fEl)
  })
  if (findEmpty) {
    popEmptyMsg()
    if (thisEl) {
      if (oVal) {
        removeClass(thisEl.parentNode, 'st-empty')
        thisEl.textContent = oVal
      }
    }
    !thisEl && addClass(findEmpty.parentNode, 'empty-warning')
    return true
  }
}
function popEmptyMsg () {
  handleToast({msg: LNG.cannotBeEmpty, showToast: true})
}

function renderSubRow ({subRow, eItem}) {
  if (subRow) {
    const {label: subRowLabel, labelAdding, subItems} = subRow
    const divSub = document.createElement('div')
    divSub.className = 'st-data-row-item-sub'

    const subLabel = document.createElement('div')
    subLabel.className = 'st-data-row-item-subLabel'
    subLabel.innerHTML = subRowLabel

    const subBtnAdd = document.createElement('div')
    subBtnAdd.className = 'st-data-row-item-subBtn-add'
    subBtnAdd.innerHTML = labelAdding

    const breakLine = document.createElement('hr')
    breakLine.className = 'breakLine-gp'

    const subList = document.createElement('div')
    subList.className = 'st-data-row-item-subList'

    eItem.appendChild(breakLine)
    eItem.appendChild(divSub)
    divSub.appendChild(subLabel)
    divSub.appendChild(subList)
    divSub.appendChild(subBtnAdd)

    subBtnAdd.addEventListener('click', () => {
      if (onFindEmpty({inputClassName: '.st-category-list .st-data-row-item-subRow-input'})) {
        return false
      }

      addSubRowItem({eParent: subList})
    })

    if (subItems) {
      for (const subItem of subItems) {
        addSubRowItem({eParent: subList, val: subItem.name, id: subItem.id})
      }
    }
  }
}

function addSubRowItem ({eParent, placeholder, val, id}) {
  const sItem = document.createElement('div')

  if (id) {
    sItem.dataset.id = id
  }

  const pClass = 'st-data-row-item-subRow-item'
  sItem.className = pClass

  const sInput = document.createElement('span')
  sInput.className = 'st-data-row-item-subRow-input'
  sInput.contentEditable = true
  sInput.setAttribute('role', 'textbox')

  if (val) {
    sInput.textContent = val
  }

  const sDel = document.createElement('img')
  sDel.src = './medias/img/delete.png'
  sDel.className = 'st-data-row-item-subRow-del'

  eParent.appendChild(sItem)
  sItem.appendChild(sInput)
  sItem.appendChild(sDel)

  onSetPlaceholderForContentEditableElement({
    eInput: sInput, pClass,
    onBlur () {
      upOnBlurForContentEditable({sInput, val, id: id || sItem.getAttribute('data-id'), parentClass: 'st-data-row-item', prop: 'subCategory', extraIdName: 'catId', doSyncData: true, sItem})
    }
  })
  sDel.addEventListener('click', () => {
    const eP = findAncestor(sDel, pClass)
    const pId = eP.dataset.id
    if (!pId) {
      sItem.parentNode.removeChild(sItem)
    }
    else {
      const catId = findAncestor(sInput, 'st-data-row-item').dataset.id
      upDataType({
        id: pId, doRemove: true, prop: 'subCategory',
        extra: {catId},
        onSuccess () {
          sItem.parentNode.removeChild(sItem)
          syncGlobalData({
            removeId: pId, catId,
          })
        }
      })
    }
  })
  !val && sInput.focus()
}

function upOnBlurForContentEditable ({sInput, id, val, parentClass, prop,  doSyncData, extraIdName, extraIdNameVal, sItem, syncPropName, originalValue}) {
  if (onFindEmpty({thisEl: sInput, oVal: val})) {
    return false
  }
  const newVal = sInput.textContent.trim()
  const sameVal = val ? (val === newVal) : newVal === sInput.getAttribute('data-oval')
  if (sameVal) {
    return console.warn(`SAME VALUE AS BEFORE, Not going to update.`)
  }
  const extra = {}
  const isExtraIdValOk = typeof extraIdNameVal !== 'undefined' && extraIdNameVal !== null
  let extraId = null
  if (extraIdName) {
    if (!isExtraIdValOk) {
      extraId = findAncestor(sInput, parentClass).dataset.id
    }

    Object.assign(extra, {[extraIdName]: isExtraIdValOk ? extraIdNameVal : extraId})
  }
  originalValue && Object.assign(extra, {originalValue})
  upDataType({
    prop, name: newVal,
    id,
    extra,
    onSuccess (sData) {
      if (sData.id) {
        sItem.setAttribute('data-id', sData.id)
      }
      sInput.setAttribute('data-oval', newVal)
      if (doSyncData) {
        const tUp = {
          addItem: id ? null : sData,
          upItem: id ? sData : null,
        }
        if (extraIdName) {
          Object.assign(tUp, {[extraIdName]: extraId})
        }
        if (syncPropName) {
          Object.assign(tUp, {propName: syncPropName})
        }
        syncGlobalData(tUp)
      }
    }
  })
}
function upDataType ({prop, id, name, dataTypeId, doRemove, onSuccess, extra, replacing, onError}) {

  const oParams = arguments[0] || {}
  if (!prop) {
    return console.error('Up Type is required.')
  }
  const params = {prop}
  id && Object.assign(params, {id: Number(id)})
  name && Object.assign(params, {name})
  doRemove && Object.assign(params, {doRemove})
  dataTypeId && Object.assign(params, {dataTypeId})
  extra && Object.assign(params, extra)
  replacing && Object.assign(params, {replacing})
  apiRequest({
    uri: `/settings`,
    method: 'POST',
    sendData: params,
    onData (data) {
      if (data && data.errors) {
        // handleToast({msg: data.errors, showToast: true})
        if (data.replacingCategories) {
          popBox({
            labelOk: LNG.Continue,
            supportCloseBtn: true,
            onOk () {
              upDataType({...oParams, replacing: GLOBAL_DEF.replacingCategoryParams})
            },
            onRenderMsg ({msgWp}) {
              renderReplacingCategory({msgWp, categories: data.replacingCategories})
            }
          })
        }
        onError && onError()
      }
      if (data && !data.errors) {
        handleToast({msg: LNG.upSuccessfully, showToast: true})
        onSuccess && onSuccess(data)
      }
    }
  })
}

function addCategory ({moreProps, ignoreEmpty}) {
  const eParent = document.querySelector('.st-category-list')
  if (!ignoreEmpty && onFindEmpty({inputClassName: '.st-category-list .st-data-row-item-input'})) {
    return false
  }

  const params = {eParent, requireType: true, prop: 'category'}
  moreProps && Object.assign(params, moreProps)
  addDataRow(params)
}

function syncGlobalData ({addItem, removeId, upItem, catId, propName}) {
  const pName = propName || 'categories'
  let items = GLOBAL_DEF[pName]
  let fProp
  if (catId) {
    fProp = GLOBAL_DEF.categories.find(cItem => cItem.id === Number(catId))

    if (fProp) {
      fProp.subCategories = fProp.subCategories || []
      items = fProp.subCategories
    }
  }
  if (upItem) {
    const findItem = items.find(cItem => cItem.id === upItem.id)
    if (findItem) {
      Object.assign(findItem, upItem)
    }

  }
  if (addItem) {
    const findItem = items.find(cItem => cItem.id === addItem.id)
    if (!findItem) {
      items.push(addItem)
    }
  }
  if (removeId) {
    items = items.filter(fItem => fItem.id !== Number(removeId))
    if (fProp) {
      fProp.subCategories = items
    }
    else {
      GLOBAL_DEF[pName] = items
    }
  }
}

function insertCommonInput ({inputClassName, rootElClsName, itemClsName, prop, deletionClsName, val, id, doSyncData, useElementVal, extraIdName}) {
  if (onFindEmpty({inputClassName: '.' + inputClassName.split(' ')[0]})) {
    return false
  }

  const root = document.querySelector('.' + rootElClsName)
  const pClass = itemClsName.split(' ')[0]
  const div = document.createElement('div')
  div.className = itemClsName

  const editor = document.createElement('span')
  editor.contentEditable = true
  editor.setAttribute('role', 'textbox')
  editor.className = `editableContent-set ${inputClassName}`

  const del = document.createElement('img')
  del.src = './medias/img/delete.png'
  del.className = deletionClsName

  if (id) {
    div.dataset.id = id
  }
  if (val) {
    editor.textContent = val
  }
  root.appendChild(div)
  div.appendChild(editor)
  div.appendChild(del)
  const dSync = typeof doSyncData === 'boolean' ? doSyncData : true
  onSetPlaceholderForContentEditableElement({
    pClass, eInput: editor,
    onBlur () {

      const toParams = {
        sInput: editor, val, idName: 'id', prop, id:  id || div.getAttribute('data-id'), sItem: div, doSyncData: dSync, syncPropName: prop, extraIdName
      }
      if (useElementVal) {
        Object.assign(toParams, {extraIdNameVal: editor.textContent})
      }
      const originalValue = div.getAttribute('data-originalValue')
      originalValue && Object.assign(toParams, {originalValue})
      upOnBlurForContentEditable(toParams)
    }
  })

  del.addEventListener('click', () => {
    const delNode = () => {
      div.parentNode.removeChild(div)
    }
    const eP = findAncestor(del, pClass)
    const pId = eP.dataset.id
    if (pId) {
      const extra = {}
      const originalValue = div.getAttribute('data-originalValue')
      originalValue && Object.assign(extra, {originalValue})
      return upDataType({
        id: pId, doRemove: true, prop, extra,
        onSuccess () {
          delNode()
          dSync && syncGlobalData({
            removeId: pId, propName: prop
          })
        }
      })
    }
    delNode()
  })
}
function addDeepScanPath  ({val, id}) {
  insertCommonInput({
    inputClassName: 'st-path-deepScan-itemInput',
    rootElClsName: 'st-path-deepScan-list',
    itemClsName: 'st-path-deepScan-item',
    deletionClsName: 'st-data-row-item-remove',
    prop: 'deepScanPath',
    val, id,
  })
}

function addFileExclusion ({val, id}) {
  insertCommonInput({
    inputClassName: 'st-file-exclusion-itemInput',
    rootElClsName: 'st-file-exclusion-list',
    itemClsName: 'st-file-exclusion-item',
    deletionClsName: 'st-data-row-item-remove',
    prop: 'fileExclusion',
    val, id,
  })
}

function addCollectionSymbol ({val, id}) {
  insertCommonInput({
    inputClassName: 'st-collection-symbol-itemInput',
    rootElClsName: 'st-collection-symbol-list',
    itemClsName: 'st-collection-symbol-item',
    deletionClsName: 'st-data-row-item-remove',
    prop: 'collectionSymbol',
    val, id,
  })
}

function onSettingsPotentialDup () {
  const val = event.target.value
  upDataType({
    prop: 'potentialDup',
    extra: {potentialDup: val},
    onSuccess () {
      GLOBAL_DEF.potentialDup = val
    }
  })
}

function onSetProxy () {
  const evtEl = event.target
  const val = evtEl.textContent
  upDataType({
    prop: 'proxy',
    extra: {proxy: val},
    onError () {
      evtEl.textContent = ''
    },
    onSuccess () {
      GLOBAL_DEF.proxy = val
    },
  })
}

function formatFileName ({val, id}) {
  insertCommonInput({
    inputClassName: 'st-formatFileName-itemInput st-commonRv-itemInput',
    rootElClsName: 'st-formatFileName-list',
    itemClsName: 'st-formatFileName-item st-commonRv-item',
    deletionClsName: 'st-data-row-item-remove',
    prop: 'formatFileName',
    val, id,
  })
}

function clearCache (params) {
  const {doReload, doReset} = params || {}
  popBox({
    supportCloseBtn: true,
    labelOk: LNG.Confirm,
    msg: LNG.clearCacheAttention,
    onOk () {
      const urlParams = {}
      doReload && Object.assign(urlParams, {doReload})
      doReset && Object.assign(urlParams, {doReset})
      apiRequest({
        uri: `/clear-cache`,
        method: 'GET',
        urlParams,
        onData (data) {
          if (!data.errors) {
            handleToast({msg: 'upSuccessfully', showToast: true})
          }
        }
      })
    }
  })
}

function onSetTmdbKey () {
  const evtEl = event.target
  const val = evtEl.textContent
  const tmdbKey = val.trim === '' ? '' : val

  upDataType({
    prop: 'tmdbKey',
    extra: {tmdbKey},
    onSuccess () {
      GLOBAL_DEF.tmdbKey = tmdbKey || ''
    },
    onError () {
      evtEl.textContent = ''
    }
  })
}
function onInputClearDataBeforeAddingChange () {
  const evtEl = event.target
  const tVal = Number(evtEl.checked)
  console.log(`onInputClearDataBeforeAddingChange evtEl `, evtEl.checked)
  upDataType({
    prop: 'clearDataBeforeAdding',
    extra: {clearDataBeforeAdding: tVal},
    onSuccess () {
      GLOBAL_DEF.clearDataBeforeAdding = tVal
      onShowKeepWatchedInput(tVal)
    },
    onError () {
    }
  })
}
function onInputKeepThoseWatchedVideosChange () {
  const evtEl = event.target
  const tVal = Number(evtEl.checked)
  console.log(`onInputKeepThoseWatchedVideosChange evtEl `, evtEl)
  upDataType({
    prop: 'keepThoseWatchedVideos',
    extra: {keepThoseWatchedVideos: tVal},
    onSuccess () {
      GLOBAL_DEF.keepThoseWatchedVideos = tVal
    },
    onError () {
    }
  })
}
function onShowKeepWatchedInput (doShow) {
  const el = document.querySelector('.keepWatched-wp')
  if (doShow) {
    el.classList.remove('hidden')
  }
  else {
    el.classList.add('hidden')
  }
}
