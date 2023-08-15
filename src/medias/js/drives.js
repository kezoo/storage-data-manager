function onAddDrivesDataClickFn () {
  GLOBAL_DEF.checkDirPath = ''
  handleCategoryUI()
  getDrives({
    onData ({data}) {
      const drives = data && data.drives
      if (Array.isArray(drives) && drives.length) {
        handleModalStyle('drives', 'open')
        GLOBAL_DEF.drives = drives
        const listWp = document.querySelector('.hdd-list')
        listWp.style.maxHeight = document.body.clientHeight * 0.6
        listWp.innerHTML = ''
        for (const [index, drive] of drives.entries()) {
          appendDriveElement({drive, listWp, index})
        }
        const eItems = document.querySelectorAll('.hdd-drive-item')
        const eItemList = Array.from(eItems)
        for (const eItem of eItemList) {
          eItem.addEventListener('change', (evt) => {
            const eP = evt.target.parentNode.parentNode
            const itemData = drives[eP.dataset.index]

            const ePressed = document.querySelector('.hdd-dir-item-name.item-pressed')
            if (ePressed) {
              removeClass(ePressed, 'item-pressed')
            }
            upSelection({
              el: evt.target,
              path: `${itemData.driveLetter}:\\`,
              driveLetter: itemData.driveLetter,
              driveLabel: itemData.driveLabel
            })
            getDirs({
              dirpath: GLOBAL_DEF.checkDirPath,
              parentNode: eP,
              onData ({data: gData}) {
                const dirs = gData && gData.dirs
                try {
                  handleDirs({dirs, driveData: itemData, parentNode: eP})
                }
                catch (err) {console.error(':::::::::::', err)}
              }
            })
          })
        }
      }
    }
  })
}
function onAddDrivesDataClick () {
  try {
    onAddDrivesDataClickFn()
  }
  catch (err) {
    console.error(`onAddDrivesDataClick ERR: `, err)
  }
}
function handleCategoryUI () {
  const hasCategories = GLOBAL_DEF.categories.length > 0
  const eEmpty = document.querySelector('.hdd-select-wp .empty-tip-gp')
  const eSelCategory = document.querySelector('.hdd-select-wp')
  const clearSub = () => {
    const subEl = document.querySelector('.hdd-select-wp-sub')
    if (subEl && subEl.innerHTML) {subEl.innerHTML = ''}
  }
  const eSub = document.querySelector('.hdd-select-wp-sub')
  const renderSubSel = () => {
    if (GLOBAL_DEF.driveSelectedCat.subCategories && GLOBAL_DEF.driveSelectedCat.subCategories.length) {
      if (!eSub.querySelector('.hdd-select-label')) {
        const subLabel = document.createElement('span')
        subLabel.className = 'hdd-select-label'
        subLabel.innerHTML = LNG.selectSubCat
        eSub.appendChild(subLabel)
      }
      renderSelection({
        options: GLOBAL_DEF.driveSelectedCat.subCategories,
        el: eSub,
        selection: GLOBAL_DEF.driveSelectedSubCat,
        onChange ({val}) {
          syncSelectedCategory({sId: Number(val)})
        }
      })
    }
    else {
      clearSub()
    }
  }

  if (!hasCategories) {
    eEmpty.innerHTML = LNG.haveNoCategory
    const rLink = document.createElement('span')
    rLink.innerHTML = LNG.goToSettings
    rLink.className = 'empty-tip-fix'
    eEmpty.appendChild(rLink)
    rLink.addEventListener('click', () => {
      handleModalStyle('drives', 'close')
      openSettings()
    })
    const cSel = document.querySelector('.hdd-select-wp .st-data-select')
    if (cSel) {
      cSel.parentNode.removeChild(cSel)
    }
    clearSub()
  }
  if (hasCategories) {
    eEmpty.innerHTML = ''
  }

  syncSelectedCategory()
  renderSelection({
    options: GLOBAL_DEF.allCategory(),
    el: eSelCategory,
    selection: GLOBAL_DEF.driveSelectedCat,
    insertBeforeEl: eEmpty,
    onChange ({val}) {
      syncSelectedCategory({cId: Number(val)})
      renderSubSel()
    }
  })
  renderSubSel()
}

function renderSelection ({options, valueProp, textProp, el, selection, onChange, insertBeforeEl, selectedId}) {
  const rSel = el.querySelector('.st-data-select')
  if (rSel) {
    rSel.parentNode.removeChild(rSel)
  }
  const eSelect = document.createElement('select')
  eSelect.className = 'st-data-select'
  const vProp = valueProp || 'id'
  const tProp = textProp || 'name'

  insertBeforeEl ? el.insertBefore(eSelect, insertBeforeEl) :  el.appendChild(eSelect)

  if (options) {
    for (const oItem of options) {
      const eOption = document.createElement('option')
      eOption.value = oItem[vProp] || ''
      if (selection && selection[vProp] === Number(eOption.value)) {
        eOption.selected = true
      }
      if (!isUndefined(selectedId) && selectedId === Number(eOption.value)) {
        eOption.selected = true
      }
      eOption.innerHTML = oItem[tProp] || ''
      eSelect.appendChild(eOption)
    }
  }

  eSelect.addEventListener('change', (evt) => {
    const val = evt.target.value
    const optionItem = (options || []).find(oItem => oItem.id === Number(val))
    onChange && onChange({val, optionItem})
  })
}
function syncSelectedCategory (params) {
  const {cId, sId} = params || {}
  const allCat = GLOBAL_DEF.allCategory()

  if (!GLOBAL_DEF.driveSelectedCat) {
    GLOBAL_DEF.driveSelectedCat = allCat[0]
  }

  if (!GLOBAL_DEF.driveSelectedSubCat && GLOBAL_DEF.driveSelectedCat) {
    if (GLOBAL_DEF.driveSelectedCat && GLOBAL_DEF.driveSelectedCat.subCategories && GLOBAL_DEF.driveSelectedCat.subCategories.length) {
      GLOBAL_DEF.driveSelectedSubCat = GLOBAL_DEF.driveSelectedCat.subCategories[0]
    }
  }

  if (cId) {
    const cSelection = allCat.find(fItem => fItem.id === cId)
    if (cSelection) {
      GLOBAL_DEF.driveSelectedCat = cSelection
      GLOBAL_DEF.driveSelectedSubCat = null
      syncSelectedCategory()
    }
  }

  if (sId && GLOBAL_DEF.driveSelectedCat && GLOBAL_DEF.driveSelectedCat.subCategories) {
    const cSelection = GLOBAL_DEF.driveSelectedCat.subCategories.find(fItem => fItem.id === sId)
    if (cSelection) {
      GLOBAL_DEF.driveSelectedSubCat = cSelection
    }
  }

  console.log(`syncSelectedCategoryFunc `)
  if (GLOBAL_DEF.driveSelectedCat) {
    const findC = allCat.find(fItem => fItem.id === GLOBAL_DEF.driveSelectedCat.id)
    console.log(`syncSelectedCategoryFunc `, allCat, findC)
    if (findC) {
      Object.assign(GLOBAL_DEF.driveSelectedCat, findC)
    }
    else {
      GLOBAL_DEF.driveSelectedCat = null
      GLOBAL_DEF.driveSelectedSubCat = null
      syncSelectedCategory()
    }
  }

  if (GLOBAL_DEF.driveSelectedSubCat) {
    const fSub = GLOBAL_DEF.driveSelectedCat && GLOBAL_DEF.driveSelectedCat.subCategories && GLOBAL_DEF.driveSelectedCat.subCategories.find(fItem => fItem.id === GLOBAL_DEF.driveSelectedSubCat.id)
    if (fSub) {
      Object.assign(GLOBAL_DEF.driveSelectedSubCat, fSub)
    }
    else {
      GLOBAL_DEF.driveSelectedSubCat = null
      syncSelectedCategory()
    }
  }

  if (GLOBAL_DEF.filter.category) {
    const findIt = GLOBAL_DEF.allCategory().find(fItem => fItem.id === GLOBAL_DEF.filter.category.id)
    console.log(`loadCategoryFunc `, findIt)
    if (findIt) {
      Object.assign(GLOBAL_DEF.filter.category, findIt)
    }
    else {
      GLOBAL_DEF.filter.category = null
    }
    GLOBAL_DEF.subCategoryDisplayForFilter = GLOBAL_DEF.filter.category && GLOBAL_DEF.filter.category.subCategories || []
  }

  if (GLOBAL_DEF.filter.subCategory) {
    const findIt = GLOBAL_DEF.filter.category && (GLOBAL_DEF.filter.category.subCategories || []).find(fItem => fItem.id === GLOBAL_DEF.filter.subCategory.id)
    console.log(`loadSubCategoryFunc `, findIt)
    if (findIt) {
      Object.assign(GLOBAL_DEF.filter.subCategory, findIt)
    }
    else {
      GLOBAL_DEF.filter.subCategory = null
    }
  }
}
function upSelection ({el, driveLetter, path, driveLabel}) {
  const findSelected = document.querySelector('.hdd-drive-item-wp.selected')

  if (findSelected) {
    removeClass(findSelected, 'selected')
  }
  const eP = findAncestor(el, 'hdd-drive-item-wp')
  addClass(eP, 'selected')

  upPathValue({pathVal: path})
  GLOBAL_DEF.checkDirPath = path
  GLOBAL_DEF.selectedDriveLabel = driveLabel
}
function upPathValue ({pathVal}) {
  const eDriveValue = document.querySelector('.hdd-drive-value')
  eDriveValue.innerHTML = pathVal
}
function getDrives ({onData}) {
  apiRequest({
    uri: `/drives`,
    onData (data) {
      onData && onData({data})
    }
  })
}
function getDirs ({onData, dirpath, parentNode}) {
  if (parentNode && parentNode.querySelector(':scope>.hdd-dirs')) {
    return console.warn('Already added')
  }
  apiRequest({
    uri: `/folders`,
    urlParams: {dirpath},
    onData (data) {

      if (data && (!Array.isArray(data.dirs) || !data.dirs.length)) {
        handleToast({msg: LNG.noDirectory, showToast: true})
        Object.assign(data, {noDir: true})
      }
      onData && onData({data})
    }
  })
}

function appendDriveElement ({drive, listWp, index}) {
  const eWp = document.createElement('div')
  eWp.className = 'hdd-drive-item-wp'

  const eItem = document.createElement('label')
  eItem.className = 'hdd-drive-item'

  const eRadio = document.createElement('input')
  eRadio.type = 'radio'
  eRadio.name = 'drive-radio'
  eRadio.className = 'hdd-drive-item-radio'

  const eLetter = document.createElement('div')
  eLetter.className = 'hdd-drive-item-letter'
  eLetter.innerHTML = `${drive.driveLetter}:`

  const eLabel = document.createElement('div')
  eLabel.className = 'hdd-drive-item-label'
  eLabel.innerHTML = `${drive.driveLabel}`

  listWp.appendChild(eWp)
  eWp.appendChild(eItem)
  eItem.appendChild(eRadio)
  eItem.appendChild(eLetter)
  eItem.appendChild(eLabel)
  eWp.dataset.index = index
}

function handleDriveListModalHide () {
  const eDriveValue = document.querySelector('.hdd-drive-value')
  const ePath = document.querySelector('.hdd-path-value')
  eDriveValue.innerHTML = ''
  addClass(ePath, 'hidden')
}

function onScanDrive () {

  let errMsg = ''
  const sParams = {dirPath: GLOBAL_DEF.checkDirPath}

  if (GLOBAL_DEF.selectedDriveLabel) {
    sParams.driveLabel = GLOBAL_DEF.selectedDriveLabel
  }
  if (GLOBAL_DEF.driveSelectedCat) {
    sParams.catId = GLOBAL_DEF.driveSelectedCat.id
  }
  if (GLOBAL_DEF.driveSelectedSubCat) {
    sParams.subCatId = GLOBAL_DEF.driveSelectedSubCat.id
  }
  if (!errMsg && !sParams.dirPath) {
    errMsg = LNG.noDirPathTip
  }
  if (errMsg) {
    return handleToast({msg: errMsg, showToast: true})
  }

  popBox({
    supportCloseBtn: true,
    labelOk: LNG.Confirm,
    onRenderMsg ({msgWp}) {
      const eTitle = document.createElement('div')
      eTitle.innerHTML = LNG.goingToAddData
      eTitle.className = 'hdd-addData-popup-title  hdd-addData-popupProp'

      const ePath = document.createElement('div')
      ePath.innerHTML = sParams.dirPath
      ePath.className = 'hdd-addData-popup-path hdd-addData-popupProp'

      const eCategory = document.createElement('div')
      eCategory.innerHTML = `${LNG.category}: ${GLOBAL_DEF.driveSelectedCat.name}`
      eCategory.className = 'hdd-addData-popup-category  hdd-addData-popupProp'

      msgWp.appendChild(eTitle)
      msgWp.appendChild(ePath)
      msgWp.appendChild(eCategory)

      if (GLOBAL_DEF.driveSelectedSubCat) {
        const eSub = document.createElement('div')
        eSub.innerHTML = `${LNG.subCategory}: ${GLOBAL_DEF.driveSelectedSubCat.name}`
        eSub.className = 'hdd-addData-popup-subCategory  hdd-addData-popupProp'
        msgWp.appendChild(eSub)
      }

      const noteEl = document.createElement('div')
      noteEl.className = `hdd-addData-popup-note`
      noteEl.innerHTML = LNG.addDirDataSlowResponse
      msgWp.appendChild(noteEl)
    },
    onOk () {
      removeInvalidKeys(sParams)
      apiRequest({
        uri: `/file/scan`,
        sendData: {...sParams},
        method: 'POST',
        onData (data) {
          if (data && data.countFound) {
            try {
              popBox({
                onRenderMsg ({msgWp}) {
                  renderAddingDataResult({msgWp, ...data})
                }
              })
            }
            catch (err) {
              console.error(`err::::::::::`, err)
            }
          }
        }
      })
    }
  })

}

function handleDirs ({dirs, driveData, parentNode}) {
  const hasDir = Array.isArray(dirs) && dirs.length > 0

  if (hasDir) {
    const pItem = document.createElement('div')
    pItem.className = 'hdd-dirs'
    parentNode.appendChild(pItem)
    for (const [index, dir] of dirs.entries()) {
      const dirItem = document.createElement('div')
      dirItem.className = 'hdd-dir-item'

      const contentWp = document.createElement('div')
      contentWp.className = 'hdd-dir-item-contentWp'

      const expand = document.createElement('span')
      expand.className = 'hdd-dir-item-exp'
      expand.innerHTML = '+'

      const name = document.createElement('div')
      name.className = 'hdd-dir-item-name'
      name.innerHTML = dir.file

      pItem.appendChild(dirItem)
      dirItem.appendChild(contentWp)
      contentWp.appendChild(expand)
      contentWp.appendChild(name)
      name.dataset.filepath = dir.filepath

      name.addEventListener('click', () => {
        const tUp = {el: name, path: dir.filepath}
        if (driveData) {
          Object.assign(tUp, {driveLabel: driveData.driveLabel})
        }

        const ePressed = document.querySelector('.hdd-dir-item-name.item-pressed')
        if (ePressed) {
          removeClass(ePressed, 'item-pressed')
        }
        addClass(name, 'item-pressed')
        upSelection(tUp)
        if (hasClass(name, 'remove')) {
          handleToast({msg: LNG.noMoreFolderInThisDir, showToast: true})
        }
      })

      expand.addEventListener('click', () => {
        if (hasClass(expand, 'expanded')) {
          const eP = findAncestor(expand, 'hdd-dir-item')
          let sign = ''
          if (hasClass(eP, 'hide')) {
            removeClass(eP, 'hide')
            sign = '-'
          }
          else {
            addClass(eP, 'hide')
            sign = '+'
          }
          expand.innerHTML = sign
          return console.debug('Already expanded')
        }
        expand.innerHTML = '-'
        addClass(expand, 'expanded')
        getDirs({
          parentNode: dirItem,
          dirpath: dir.filepath,
          onData ({data}) {
            if (data.noDir) {
              addClass(expand, 'visHidden')
              addClass(name, 'remove')
            }
            handleDirs({dirs: data && data.dirs, driveData, parentNode: dirItem})
          }
        })
      })
    }
  }
}

function renderAddingDataResult ({msgWp, countFound, countNewItems, dupItems}) {
  const renderT = ({labelVal, numVal, wpCls, extraEl, maxWpHeight}) => {
    const div = document.createElement('div')
    let wClass = 'addDataRes-wrapper'
    if (wpCls) {
      wClass += ` ${wpCls}`
    }
    div.className = wClass
    if (maxWpHeight) {
      div.style.maxHeight = maxWpHeight
    }

    const label = document.createElement('div')
    label.className = 'addDataRes-label'
    label.textContent = labelVal

    const num = document.createElement('span')
    num.className = 'addDataRes-num'
    num.textContent = numVal

    msgWp.appendChild(div)
    div.appendChild(label)
    label.appendChild(num)

    if (extraEl) {
      div.appendChild(extraEl)
    }
  }

  renderT({
    labelVal: LNG.totalNumOfIdentified,
    numVal: countFound,
    wpCls: 'addDataRes-found'
  })

  renderT({
    labelVal: LNG.newlyAdded,
    numVal: countNewItems || 0,
    wpCls: 'addDataRes-insert'
  })

  if (dupItems && dupItems.length) {
    const dList = document.createElement('div')
    dList.className = 'addDataRes-dupList'

    for (const fItem of dupItems) {
      const eDup = document.createElement('div')
      eDup.className = 'addDataRes-dupItem'

      const pA = document.createElement('div')
      pA.className = 'addDataRes-dupItem-a'
      pA.textContent = `${LNG.filename}: ${fItem.name}, ${LNG.filepath}: ${fItem.filepath}`
      eDup.appendChild(pA)
      if (fItem.oItem) {
        const pB = document.createElement('div')
        pB.className = 'addDataRes-dupItem-b'
        pB.textContent = `${LNG.filename}: ${fItem.oItem.name}, ${LNG.filepath}: ${fItem.oItem.filepath}`
        eDup.appendChild(pB)
      }

      dList.appendChild(eDup)
    }
    renderT({
      labelVal: LNG.foundPotentialDup,
      numVal: dupItems.length,
      wpCls: 'addDataRes-dup',
      extraEl: dList,
      maxWpHeight: document.body.clientHeight * 0.67
    })
  }
}

function popupUpAllLocalDrives () {
  syncPathAndCategoryConfig({doClone: true})
  popBox({
    noButton: true,
    supportCloseBtn: true,
    onRenderMsg: ({msgWp}) => {
      const popBoxRect = msgWp.parentNode.getBoundingClientRect()
      msgWp.style.paddingTop = 0

      const clsName = 'popupUpAllLocalDrives'
      const {el: rootEl} = createElement({
        clsName: clsName + '-root',
        appendToEl: msgWp
      })
      const {el: topEl} = createElement({
        clsName: clsName + '-top',
        appendToEl: rootEl
      })
      const rootPaddingBottom = 60
      const rootPaddingTop = 38
      rootEl.style.paddingBottom = rootPaddingBottom + 'px'
      rootEl.style.paddingTop = rootPaddingTop + 'px'
      topEl.style.height = rootPaddingTop + 'px'

      const {el: titleEl} = createElement({
        clsName: clsName + '-title',
        appendToEl: topEl,
        textCont: `${LNG.UpAllLocalDrivesTitle}`
      })

      const {el: containerEl} = createElement({
        clsName: clsName + '-container',
        appendToEl: rootEl
      })
      const hDiff = rootPaddingBottom + rootPaddingTop
      containerEl.style.maxHeight = `${window.innerHeight * 0.76 - hDiff}px`

      const {el: configWpEl} = createElement({
        clsName: clsName + '-configWp',
        appendToEl: containerEl,
      })
      const {el: configTitleEl} = createElement({
        clsName: clsName + '-configTitle',
        appendToEl: configWpEl,
        textCont: `${LNG.ConfigPathAndCategory}`
      })
      const {el: configPathTipEl} = createElement({
        clsName: clsName + '-configPathTip',
        appendToEl: configWpEl,
        textCont: `${LNG.PathValueTipOfPathAndCategory}`
      })
      const {el: configContentEl} = createElement({
        clsName: clsName + '-configContent',
        appendToEl: configWpEl,
      })
      const {el: addConfigEl} = createElement({
        clsName: clsName + '-addConfig' + ` CursorPointer`,
        appendToEl: configWpEl,
        textCont: `${LNG.addConfig}`
      })
      addConfigEl.addEventListener('click', (evt) => {
        const {hasErr} = checkPathAndCategory({useClone: true})
        !hasErr && addPathAndCategoryElements({
          wrapperEl: configContentEl,
        })
      })
      refillPathAndCategory({
        wrapperEl: configContentEl,
      })
      const {el: skipDriveLetterEl} = createElement({
        clsName: clsName + '-skipDriveLetter',
        appendToEl: containerEl,
      })
      const {el: skipDriveLetterLabelEl} = createElement({
        clsName: clsName + '-skipDriveLetterLabel',
        appendToEl: skipDriveLetterEl,
        textCont: `${LNG.skipDriveLetter}`
      })
      const {el: skipDriveLetterInputEl} = createElement({
        clsName: clsName + '-skipDriveLetterInput',
        appendToEl: skipDriveLetterEl,
        type: 'input',
      })
      skipDriveLetterInputEl.value = GLOBAL_DEF.skipDriveLetter
      skipDriveLetterInputEl.addEventListener('input', (evt) => {
        const sValue = evt.target.value.trim().replace(/(\s)+/gi, ' ')
        syncPathAndCategoryConfig({skipDriveLetter: sValue})
      })
      skipDriveLetterInputEl.addEventListener('blur', (evt) => {
        checkDriveLetter({letters: GLOBAL_DEF.skipDriveLetterClone})
      })
      const {el: skipDriveLetterTipEl} = createElement({
        clsName: clsName + '-skipDriveLetterTip',
        appendToEl: containerEl,
        textCont: `${LNG.skipDriveLetterTip}`
      })

      const {el: skipPathEl} = createElement({
        clsName: clsName + '-skipPathWp',
        appendToEl: containerEl,
      })
      const {el: skipPathWpEl} = createElement({
        clsName: clsName + '-skipPath',
        appendToEl: skipPathEl,
        textCont: `${LNG.skipPath}`
      })
      const {el: skipPathRightEl} = createElement({
        clsName: clsName + '-skipPathRight',
        appendToEl: skipPathEl,
      })
      const {el: skipPathInputWpEl} = createElement({
        clsName: clsName + '-skipPathInputWp',
        appendToEl: skipPathRightEl,
      })
      const {el: skipPathAddingEl} = createElement({
        clsName: clsName + '-skipPathAdding',
        appendToEl: skipPathRightEl,
        textCont: `${LNG.Add}`
      })
      const skipPathInputCls = clsName + '-skipPathInput'
      const skipPathInputRowCls = clsName + '-skipPathInputRow'
      const addSkippingPathEl = ({initValue}) => {
        const gotEmpty = GLOBAL_DEF.skipPathForPathAndCategoryClone.find(aItem => aItem.value.trim() === '')

        if (gotEmpty) {
          return handleToast({msg: LNG.cannotBeEmpty, showToast: true})
        }

        const {el: skipPathInputRow} = createElement({
          clsName: skipPathInputRowCls,
          appendToEl: skipPathInputWpEl,
        })
        const {el: skipPathInput} = createElement({
          clsName: skipPathInputCls,
          type: 'input',
          appendToEl: skipPathInputRow,
        })
        if (initValue) {
          skipPathInput.value = initValue
        }
        const {el: skipPathDel} = createElement({
          clsName: clsName + '-skipPathDel',
          type: 'img',
          src: './medias/img/delete.png',
          appendToEl: skipPathInputRow,
        })
        skipPathDel.addEventListener('click', (evt) => {
          const tIndex = evt.target.parentNode.dataset.idx
          syncPathAndCategoryConfig({
            skipPathObj: {
              sIndex: tIndex,
              sDel: true,
            },
            onUpdate: ({}) => {
              const elements = Array.from(skipPathInputWpEl.querySelectorAll(`.${skipPathInputRowCls}`))
              for (let i = 0; i < elements.length; i++) {
                const vEl = elements[i]
                const vIdx = Number(tIndex)
                console.log(`skipPathDel vIdx ${vIdx} i ${i}`)
                if (i > vIdx) {
                  vEl.dataset.idx = i-1
                }
              }
              evt.target.parentNode.parentNode.removeChild(skipPathInputRow)
            }
          })
        })
        const idx = getSiblings({el: skipPathInputRow, dir: 'prev'}).length
        skipPathInputRow.dataset.idx = idx
        !initValue && syncPathAndCategoryConfig({addSkipPath: true})
        skipPathInput.addEventListener('input', (evt) => {
          const skipPathObj = {
            sIndex: evt.target.parentNode.dataset.idx,
            value: evt.target.value,
          }
          console.log(`skipPathInput CHANGE `, skipPathObj)
          syncPathAndCategoryConfig({skipPathObj})
        })
      }

      for (const sPathItem of GLOBAL_DEF.skipPathForPathAndCategory) {
        addSkippingPathEl({initValue: sPathItem.value})
      }

      skipPathAddingEl.addEventListener('click', (evt) => {
        addSkippingPathEl({})
      })

      const {el: bottomEl} = createElement({
        clsName: clsName + '-bottom',
        appendToEl: rootEl,
      })
      bottomEl.style.height = rootPaddingBottom + 'px'
      const oBtnClsName = clsName + '-btn'
      const {el: btnSave} = createElement({
        clsName: `${oBtnClsName} ` + clsName + '-btnSaveOnly',
        appendToEl: bottomEl,
        textCont: `${LNG.save}`,
      })
      const onSubmit = (params) => {
        const {saveOnly = false, onNext} = params || {}
        const {hasErr} = checkPathAndCategory({useClone: true})
        const {hasErr: withDriveLetterError} = checkDriveLetter({letters: GLOBAL_DEF.skipDriveLetterClone})
        if (!hasErr && !withDriveLetterError) {
          GLOBAL_DEF.skipPathForPathAndCategoryClone = GLOBAL_DEF.skipPathForPathAndCategoryClone.filter(item => item.value.trim() !== '')
          syncPathAndCategoryConfig({doSave: true})
          upDataType({
            prop: 'pathAndCategory',
            extra: {
              pathAndCategory: GLOBAL_DEF.pathAndCategory,
              skipDriveLetter: GLOBAL_DEF.skipDriveLetter,
              skipPathForPathAndCategory: GLOBAL_DEF.skipPathForPathAndCategory,
              saveOnly,
            },
            onSuccess (sData) {
              closePopBox({})
              handleToast({msg: LNG.upSuccessfully, showToast: true})
              onNext && onNext({})
            }
          })
        }
      }
      btnSave.addEventListener('click', (evt) => {
        onSubmit({saveOnly: true})
      })
      const {el: btnConfirm} = createElement({
        clsName: `${oBtnClsName} ` + clsName + '-btnConfirm',
        appendToEl: bottomEl,
        textCont: `${LNG.update}`,
      })

      btnConfirm.addEventListener('click', (evt) => {
        onSubmit({
          onNext: () => {
            handleProgressOfUpdatingLocalDrives()
          }
        })
      })
      const {el: btnCancel} = createElement({
        clsName: `${oBtnClsName} ` + clsName + '-btnCancel',
        appendToEl: bottomEl,
        textCont: `${LNG.Cancel}`,
      })
      btnCancel.addEventListener('click', (evt) => {
        closePopBox({})
      })
    }
  })
}

function refillPathAndCategory (params) {
  const {wrapperEl} = params || {}
  const pList = GLOBAL_DEF.pathAndCategory || []
  for (let i = 0; i < pList.length; i++) {
    const itemData = pList[i]
    addPathAndCategoryElements({
      wrapperEl,
      itemData,
    })
  }
}
function checkDriveLetter (params) {
  const {letters: l} = params || {}
  const tLetters = l || GLOBAL_DEF.skipDriveLetter
  let errorMsg = ''
  const letters = tLetters.split(' ').filter(str => str !== '')
  const reg = /^[a-zA-Z]$/
  let dupLetter = ''

  for (const letter of letters) {
    if (errorMsg) break
    const isValid = reg.test(letter)
    console.log(`checkDriveLetter letter ${letter} REG `, isValid)
    if (!isValid) {
      errorMsg = `${LNG.singleAlphaLetterTip}`
    }
  }

  if (!errorMsg) {
    const {dupMax} = countOccurrences({list: letters})

    if (dupMax) {
      errorMsg = `${LNG.driveLetterDupTip}: ${dupMax.name}`
    }
  }
  if (errorMsg) {
    handleToast({msg: errorMsg, showToast: true})
  }
  const res = {hasErr: !!errorMsg}
  return res
}

function checkPathAndCategory (params) {
  const {doToast = true, useClone} = params || {}
  const pathData = useClone ? GLOBAL_DEF.pathAndCategoryClone : GLOBAL_DEF.pathAndCategory
  let errorMsg = ''

  for (let i = 0; i < pathData.length; i++) {
    if (errorMsg) break;
    const itemData = pathData[i]
    const nI = i + 1
    console.log(`checkPathAndCategory itemData `, itemData)
    if (itemData.path.trim() === '') {
      errorMsg = `#${nI} ${LNG.path} ${LNG.cannotBeEmpty}`
    }
    if (!errorMsg) {
      const isValid = !(/\?|\:|\"|\<|\>|\*/.test(itemData.path))
      if (!isValid) {
        errorMsg = `#${nI} ${LNG.PathValueShouldNotContainAnyFollowingCharacter}: ` + '?\:"<>*'
      }
    }
  }
  if (!errorMsg) {
    const {dupMax} = countOccurrences({list: pathData, asPropName: 'path'})
    if (dupMax) {
      errorMsg = `${LNG.foundDupPathTip}: ${dupMax.path}`
    }
  }
  if (errorMsg && doToast) {
    handleToast({msg: errorMsg, showToast: true})
  }
  const res = {hasErr: !!errorMsg}
  return res
}
function createElement (params) {
  const {type = 'div', clsName, textCont, appendToEl, src} = params || {}
  const el = document.createElement(type)
  const res = {el}

  if (clsName) {
    el.className = res.clsName = clsName
  }

  if (textCont) {
    el.textContent = textCont
  }

  if (src) {
    el.src = src
  }

  if (appendToEl) {
    appendToEl.appendChild(el)
  }

  return res;
}
function addPathAndCategoryElements ({wrapperEl, itemData}) {
  const clsName = 'PathAndCategoryConfig'
  const itemClsName = clsName + '-item'
  const {el: itemEl} = createElement({
    clsName: itemClsName,
    appendToEl: wrapperEl
  })
  const assignItemIndex = (idx, nEl) => {
    (nEl || itemEl).dataset.index = idx
  }
  let {length: seq} = getSiblings({el: itemEl, dir: 'prev'})
  syncPathAndCategoryConfig({
    idx: seq,
  })
  const {el: seqEl} = createElement({
    clsName: clsName + '-seq',
    appendToEl: itemEl,
  })
  const {el: seqCharEl} = createElement({
    clsName: clsName + '-seqChar',
    appendToEl: seqEl,
    textCont: `#`
  })
  const seqNumCls = clsName + '-seqNum'
  const {el: seqNumEl} = createElement({
    clsName: seqNumCls,
    appendToEl: seqEl,
    textCont: `${++seq}`
  })
  const {el: pathWpEl} = createElement({
    clsName: clsName + '-pathWp',
    appendToEl: itemEl
  })
  const {el: pathLabelEl} = createElement({
    clsName: clsName + '-pathLabel',
    appendToEl: pathWpEl,
    textCont: `${LNG.path}`
  })
  const {el: pathInputEl} = createElement({
    type: 'input',
    clsName: clsName + '-pathInput',
    appendToEl: pathWpEl,
  })

  if (itemData) {pathInputEl.value = itemData.path}

  pathInputEl.addEventListener('input', (evt) => {
    const val = evt.target.value
    const idx = getSiblings({el: itemEl, dir: 'prev'}).length
    syncPathAndCategoryConfig({
      idx, path: val,
    })
    console.log(`pathInputEl idx ${idx} `, val, )
  })

  const {el: sDel} = createElement({
    type: 'img',
    clsName: clsName + '-del' + ' CursorPointer',
    appendToEl: itemEl,
    src: './medias/img/delete.png'
  })
  assignItemIndex(seq)
  sDel.addEventListener('click', (evt) => {
    const idx = getSiblings({el: itemEl, dir: 'prev'}).length
    syncPathAndCategoryConfig({
      idx, doDel: true,
      onUpdate: ({data: itemsData}) => {
        const elements = Array.from(wrapperEl.querySelectorAll(`.${itemClsName}`))
        for (let i = 0; i < elements.length; i++) {
          if (i > idx) {
            const tEl = elements[i]
            const itemData = itemsData[i]

            if (tEl) {
              assignItemIndex(i, tEl)
              const seqNumElement = tEl.querySelector(`.${seqNumCls}`)
              seqNumElement && (seqNumElement.textContent = i)
            }
            console.log(`onUpdate i ${i} idx ${idx} itemData `, itemData)
          }
        }
        itemEl.parentNode.removeChild(itemEl)
      }
    })
  })

  const addCategoryEl = ({isSub, options, selectedId}) => {
    const {el: categoryWpEl, clsName: categoryWpClsName} = createElement({
      clsName: clsName + '-categoryWp' + (isSub ? ` subItem` : ''),
      appendToEl: itemEl,
    })
    const {el: categoryLabelEl} = createElement({
      clsName: clsName + '-categoryLabel',
      appendToEl: categoryWpEl,
      textCont: isSub ? `${LNG.subCategory}` : `${LNG.category}`,
    })
    const {el: categorySelectionEl} = createElement({
      clsName: clsName + '-categorySelection',
      appendToEl: categoryWpEl,
    })
    const categories = GLOBAL_DEF.allCategory()
    const paramsForRendering = {
      options: options || categories,
      el: categoryWpEl,
      selectedId,
    }
    renderSelection({
      ...paramsForRendering,
      onChange ({val, optionItem}) {
        console.log(`Selection change optionItem `, optionItem)
        const isDefault = val < 0
        const subCatEl = itemEl.querySelector(`.${categoryWpClsName}.subItem`)
        const removeSubCatEl = () => {
          subCatEl && subCatEl.parentNode.removeChild(subCatEl)
        }
        if (isDefault) {
          !isSub && removeSubCatEl()
        }
        if (!isDefault) {
          if (!isSub) {
            removeSubCatEl()
            const selectedCat = categories[val]
            const sItems = selectedCat.subCategories || []
            appendDefaultSelectionItem(sItems)
            addCategoryEl({
              isSub: true,
              options: sItems,
            })
          }
        }
        const idx = getSiblings({el: itemEl, dir: 'prev'}).length
        syncPathAndCategoryConfig({
          idx, category: optionItem, isSubCategory: isSub,
        })
      }
    })
  }
  addCategoryEl({
    selectedId: itemData && itemData.categoryId,
  })
  if (itemData && itemData.categoryId) {
    const cItem = GLOBAL_DEF.allCategory().find(aItem => aItem.id === itemData.categoryId)
    const subItems = cItem && cItem.subCategories || []
    appendDefaultSelectionItem(subItems)
    addCategoryEl({
      selectedId: itemData && itemData.subCategoryId,
      isSub: true,
      options: subItems,
    })
  }
}
function appendDefaultSelectionItem (items) {
  const findDef = items.find(sItem => sItem.id === -1)
  !findDef && items.unshift(DEF_CATEGORY_ITEM())
}
function syncPathAndCategoryConfig (params) {
  const {idx, path, category, isSubCategory, doClone, doDel, doSave, onUpdate, skipDriveLetter, addSkipPath, skipPathObj} = params || {}

  if (doClone) {
    GLOBAL_DEF.pathAndCategoryClone = JSON.parse(JSON.stringify(GLOBAL_DEF.pathAndCategory))
    GLOBAL_DEF.skipDriveLetterClone = GLOBAL_DEF.skipDriveLetter
    GLOBAL_DEF.skipPathForPathAndCategoryClone = JSON.parse(JSON.stringify(GLOBAL_DEF.skipPathForPathAndCategory))
  }

  const data = GLOBAL_DEF.pathAndCategoryClone
  let itemData = data[idx]

  if (!isUndefined(idx) && !itemData) {
    itemData = {path: '', categoryId: null, subCategoryId: null}
    data[idx] = itemData
  }

  if (!isUndefined(path)) {
    itemData.path = path
  }

  if (!isUndefined(category)) {
    const catProp = isSubCategory ? 'subCategoryId' : 'categoryId'

    if (!isSubCategory && category.id !== itemData.categoryId) {
      itemData.subCategoryId = null
      console.log(`syncPathAndCategoryConfig RESET `)
    }

    Object.assign(itemData, {[catProp]: category.id})
  }

  if (typeof skipDriveLetter === 'string') {
    GLOBAL_DEF.skipDriveLetterClone = skipDriveLetter
  }

  if (doDel) {
    data.splice(idx, 1)
  }

  if (addSkipPath) {
    GLOBAL_DEF.skipPathForPathAndCategoryClone.push({value: ''})
  }

  if (skipPathObj) {
    const {sIndex, value, sDel} = skipPathObj

    if (sDel) {
      GLOBAL_DEF.skipPathForPathAndCategoryClone.splice(sIndex, 1)
    }
    if (typeof value === 'string') {
      GLOBAL_DEF.skipPathForPathAndCategoryClone[sIndex].value = value
    }
  }

  GLOBAL_DEF.pathAndCategoryClone = data

  if (doSave) {
    GLOBAL_DEF.pathAndCategory = GLOBAL_DEF.pathAndCategoryClone
    GLOBAL_DEF.skipDriveLetter = GLOBAL_DEF.skipDriveLetterClone
    GLOBAL_DEF.skipPathForPathAndCategory = GLOBAL_DEF.skipPathForPathAndCategoryClone
    delete GLOBAL_DEF.pathAndCategoryClone
    delete GLOBAL_DEF.skipDriveLetterClone
    delete GLOBAL_DEF.skipPathForPathAndCategoryClone
  }
  onUpdate && onUpdate({data})
  console.log(`syncPathAndCategoryConfig skipDriveLetter ${GLOBAL_DEF.skipDriveLetter} skipDriveLetterClone ${GLOBAL_DEF.skipDriveLetterClone} pathAndCategory `, GLOBAL_DEF.pathAndCategory, 'pathAndCategoryClone ', GLOBAL_DEF.pathAndCategoryClone, 'skipPathForPathAndCategory ', GLOBAL_DEF.skipPathForPathAndCategory, 'skipPathForPathAndCategoryClone ', GLOBAL_DEF.skipPathForPathAndCategoryClone)
}

function handleProgressOfUpdatingLocalDrives () {
  popBox({
    noButton: true,
    supportCloseBtn: true,
    onRenderMsg: ({msgWp}) => {
      const clsName = 'popupUpdatingLocalDrives'
      const {el: rootEl} = createElement({
        clsName: clsName + '-root',
        appendToEl: msgWp
      })
      const {el: closeEl} = createElement({
        clsName: clsName + '-close CursorPointer',
        appendToEl: msgWp,
      })
      closeEl.innerHTML = '&times;'

      const {el: titleEl} = createElement({
        clsName: clsName + '-title',
        appendToEl: rootEl,
        textCont: `${LNG.upAllHddsData}`
      })
      let driveWp
      let alreadyClosed = false

      openWebSocket({
        url: '/pathAndCategory',
        onRecvMsg: ({dataObj, closeWs}) => {

          if (!closeEl.dataset.up) {
            closeEl.dataset.up = 0
            closeEl.addEventListener('click', (evt) => {
              if (!alreadyClosed) {
                closeWs()
              }
              closePopBox({})
            })
          }

          console.log(`popupUpdatingLocalDrives msg dataObj `, dataObj)

          const {msgType, paths, driveItem, drives, invalidReason, startInnerLoop, endInnerLoop, path: dirPath, innerIndex, countNewItems } = dataObj
          const doStartOuterLoop = msgType === 'START_OUTER_LOOP'
          const doEndOuterLoop = msgType === 'END_OUTER_LOOP'
          const doStartInnerLoop = msgType === 'START_INNER_LOOP'
          const doEndInnerLoop = msgType === 'END_INNER_LOOP'
          const isDone = msgType === 'DONE'
          const drivePathsCls = clsName + '-drivePaths'

          if (isDone) {
            alreadyClosed = true
            handleToast({msg: LNG.upSuccessfully, showToast: true})
            closeWs()
          }

          if (drives) {
            const {el: drivesWpEl} = createElement({
              clsName: clsName + '-drives',
              appendToEl: rootEl,
            })
            drivesWpEl.style.maxHeight = window.innerHeight * 0.76 + 'px'
            driveWp = drivesWpEl

            for (const drive of drives) {
              const {driveLetter, driveLabel} = drive
              const {el: driveEl} = createElement({
                clsName: clsName + '-drive',
                appendToEl: drivesWpEl,
              })
              driveEl.dataset.letter = driveLetter

              const {el: driveUpEl} = createElement({
                clsName: clsName + '-driveUp',
                appendToEl: driveEl,
              })
              const {el: driveLetterEl} = createElement({
                clsName: clsName + '-driveLetter',
                appendToEl: driveUpEl,
                textCont: driveLetter + ':',
              })
              const {el: driveLabelEl} = createElement({
                clsName: clsName + '-driveLabel',
                appendToEl: driveUpEl,
                textCont: driveLabel,
              })
              const {el: driveRightEl} = createElement({
                clsName: clsName + '-driveRight',
                appendToEl: driveUpEl,
              })

              const {el: driveLoaderEl} = createElement({
                clsName: clsName + '-driveLoader uvLoader',
                appendToEl: driveRightEl,
              })

              const {el: driveResultIconEl} = createElement({
                clsName: clsName + '-driveResultIcon checkmark',
                appendToEl: driveRightEl,
                textCont: 'L'
              })

              const {el: drivePathsEl} = createElement({
                clsName: drivePathsCls,
                appendToEl: driveEl,
              })
            }
          }

          if (driveWp && driveItem) {
            const {driveLetter} = driveItem
            const driveEl = driveWp.querySelector(`[data-letter="${driveLetter}"]`)
            const clsRunning = 'running'
            const clsDone = 'done'

            if (doStartOuterLoop) {
              addClass(driveEl, clsRunning)
            }
            if (doEndOuterLoop) {
              removeClass(driveEl, clsRunning)
              addClass(driveEl, clsDone)
            }
            const drivePathsEl = driveEl.querySelector('.' + drivePathsCls)
            if (paths) {
              for (let i = 0; i < paths.length; i++) {
                const path = paths[i]
                const {el: pathEl} = createElement({
                  clsName: clsName + '-path',
                  appendToEl: drivePathsEl,
                })
                pathEl.dataset.index = i

                const {el: pathLoaderEl} = createElement({
                  clsName: clsName + '-pathLoader uvLoader',
                  appendToEl: pathEl,
                })
                const {el: pathCheckEl} = createElement({
                  clsName: clsName + '-pathCheck checkmark',
                  appendToEl: pathEl,
                  textCont: 'L'
                })
                const {el: pathInvalidIconEl} = createElement({
                  clsName: clsName + '-pathInvalidIcon',
                  appendToEl: pathEl,
                })
                pathInvalidIconEl.innerHTML ='&times;'

                const {el: pathLabelEl} = createElement({
                  clsName: clsName + '-pathLabel',
                  appendToEl: pathEl,
                  textCont: path,
                })
              }
            }

            const findPathEl = drivePathsEl && drivePathsEl.querySelector(`[data-index="${innerIndex}"]`)

            if (invalidReason && findPathEl && doStartInnerLoop) {
              addClass(findPathEl, 'invalid')
              console.log(`doStartInnerLoop HEIGHT `, findPathEl.parentNode.parentNode.clientHeight, findPathEl.parentNode.parentNode)
              const {el: pathInvalidReasonEl} = createElement({
                clsName: clsName + '-pathInvalidReason',
                appendToEl: findPathEl,
                textCont: invalidReason,
              })
            }
            if (doStartInnerLoop) {
              const drivesWpHeight = driveWp.clientHeight
              const drivesWpScrollTop = driveWp.scrollTop
              const driveElOffTop = driveEl.offsetTop
              const driveElHeight = driveEl.clientHeight
              const requiredScrollH = driveElOffTop - drivesWpHeight + driveElHeight

              console.log(`DriveLetter ${driveLetter}
                drivesWpHeight ${drivesWpHeight}
                driveElOffTop ${driveElOffTop}
                driveElHeight ${driveElHeight}
                requiredScrollH ${requiredScrollH} - drivesWpScrollTop ${drivesWpScrollTop}
              `)

              if (requiredScrollH > 0 && drivesWpScrollTop < requiredScrollH) {
                driveWp.scrollTo(0, requiredScrollH)
              }
            }
            if (!invalidReason && doStartInnerLoop && findPathEl) {
              addClass(findPathEl, 'running')
            }
            if (!invalidReason && doEndInnerLoop && findPathEl) {
              removeClass(findPathEl, 'running')
              addClass(findPathEl, 'done')

              if (countNewItems) {
                const {el: pathCountEl} = createElement({
                  clsName: clsName + '-pathCount',
                  appendToEl: findPathEl,
                  textCont: `+${countNewItems}`,
                })
              }
            }
          }
        }
      })
    }
  })
}
