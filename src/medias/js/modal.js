const imgHost = 'https://image.tmdb.org/t/p/w500'
const imgExt = '.jpg'
let contentHtmlBackup = ''
let titlesHtmlBackup = ''
let showResearch = false
let prevQueryName = null

function staticUrls () {
  const urls = {
    coverHost: `${hostUrl()}/medias/covers/`,
    creditHost: `${hostUrl()}/medias/credits/`,
    noImage: `${hostUrl()}/medias/img/noimage.png`,
  }
  return urls
}
function makeCoverUrl (id) {
  return staticUrls().coverHost + id + imgExt
}
function makeCreditUrl (id) {
  return staticUrls().creditHost + id + imgExt
}
function getCoverUrl (storedPics, posterPath) {
  const coverRemote = posterPath ? imgHost + posterPath : staticUrls().noImage
  const tCover =  (storedPics && storedPics.cover) ? makeCoverUrl(storedPics.cover) : coverRemote
  return tCover
}
function handleModalStyle (mType, actionType) {
  const eModal = document.querySelector('.modal')
  const mTypeClass = `.modal-type.${mType}`
  const eType = document.querySelector(mTypeClass)
  const toOpen = (actionType === 'open')
  const toClose = (actionType === 'close')
  const eResearch = document.querySelector('.videos-research')
  const eTitles = document.querySelector('.videos-query-titles')
  const directChildren = document.querySelectorAll('.modal-inner>*')
  const directChildrenList = Array.from(directChildren)
  const isSettings = mType === 'settings'
  const isMenus = mType === 'menus'
  const isVideos = mType === 'videos'

  if (!eType) return false

  if (toOpen) {
    GLOBAL_DEF.lastModalType = mType
    removeClass(eType, 'hidden')
    addClass(eModal, 'open')
  }

  if (toClose) {
    for (const dC of directChildrenList) {
      addClass(dC, 'hidden')
    }
    removeClass(eModal, 'open')
    showResearch = false
    if (isVideos && contentHtmlBackup) {
      document.querySelector(`.videos-content`).innerHTML = contentHtmlBackup
    }

    if (titlesHtmlBackup) {
      eTitles.innerHTML = titlesHtmlBackup
    }

    prevQueryName = null
    DATA_HELPERS.queriedVideos = []
    handlePageBtnStyle({ show: false })
    handleDriveListModalHide()
    if (isSettings) {
      onFilterCategoryChange({
        doReRender: true,
        catId: (GLOBAL_DEF.filter.category && GLOBAL_DEF.filter.category.id) || DEF_CATEGORY_ITEM().id,
        subCatId: (GLOBAL_DEF.filter.subCategory && GLOBAL_DEF.filter.subCategory.id) || DEF_CATEGORY_ITEM().id
      })
    }
    if (isMenus) {
      document.querySelector('.popMenu-list').innerHTML = ''
    }
  }

}

function generateItemsHtml (params) {
  const { eHost, childHtml, dataLen, doAppend } = params
  let itemsHtml = ''

  if (!doAppend) {
    eHost.innerHTML = ''
  }

  for (let i = 0; i < dataLen; i++) {
    itemsHtml += childHtml + '\n'
  }

  if (doAppend) {
    eHost.insertAdjacentHTML('beforeend', itemsHtml)
  }
  else {
    eHost.innerHTML = itemsHtml
  }

  return true
}

function handlePageBtnStyle (params) {
  const { show } = params
  const ePage = document.querySelector('.load-more-videos')

  show ? removeClass(ePage, 'hidden') : addClass(ePage, 'hidden')
}

function handlePageBtn (params) {
  const {} = params || {}
  if (!DATA_HELPERS.queryVideoPage) return false
  return reSearch({ page: DATA_HELPERS.queryVideoPage, queryName: prevQueryName })
}

function videoItems (params) {
  const {refItemElIndex, videos, page, totalPages: pPageTotal, query: pQuery = [], currentQuery} = params || {}
  if (page) {
    DATA_HELPERS.queryVideoPage = page
  }
  const hasMoreVideos = DATA_HELPERS.queryVideoPage && pPageTotal && DATA_HELPERS.queryVideoPage < pPageTotal

  const videoRes = videos.sort((a, b) => b.videoOrder - a.videoOrder)
  handlePageBtnStyle({ show: hasMoreVideos })
  const dataLen = videos.length
  const mType = 'videos'

  handleModalStyle(mType, 'open')

  const eVideos = document.querySelector(`.${mType}-content`)
  const videoHtml = eVideos.innerHTML

  if (!contentHtmlBackup) {
    contentHtmlBackup = videoHtml
  }

  const doAppend = DATA_HELPERS.queryVideoPage > 1
  const prevLen = doAppend ? DATA_HELPERS.queriedVideos.length : 0
  DATA_HELPERS.queriedVideos = doAppend ? [...DATA_HELPERS.queriedVideos, ...videoRes] : videoRes

  const vWp = document.querySelector(`.videos.modal-type`)
  refItemElIndex && vWp.setAttribute('data-refItemElIndex', refItemElIndex)
  generateItemsHtml({
    eHost: eVideos,
    childHtml: contentHtmlBackup,
    dataLen: dataLen,
    doAppend,
  })
  function handleVideoItemHtml () {
    const eItems = [...document.querySelectorAll('.video-item')]
    videoRes.forEach((rItem, rKey) => {
      const eVideo = eItems[prevLen + rKey]
      const detailHost = rItem.detail || rItem
      const selfIndexed = (typeof rItem.detail === 'object' && rItem.detail)
      const storedPics = selfIndexed && rItem.storedPics ? JSON.parse(rItem.storedPics) : {}
      // console.log('***************', storedPics)
      const { name, title, posterPath, overview = '', releaseDate, firstAirDate, mediaType, originalTitle, originalName, productionCountries, runtime} = detailHost
      const isIndexed = rItem.fileId
      // console.log(`isIndexed::::::::::::::::::::::::`, isIndexed, 'detailHost::::::::', rItem)
      const isMovie = (mediaType === 'movie')
      const eDel = eVideo.querySelector('.video-delete')
      const eCheck = eVideo.querySelector('input[type="checkbox"]')
      const eTitle = eVideo.querySelector('.video-title')
      const eType = eVideo.querySelector('.video-type  .video-content')
      const eCover = eVideo.querySelector('.video-cover img')
      const eSynopsis = eVideo.querySelector('.video-synopsis .video-content')
      const eYear = eVideo.querySelector('.video-year .video-content')
      const eCountries = eVideo.querySelector('.video-countries .video-content')
      const eRuntime = eVideo.querySelector('.video-runtime .video-content')
      const eOTitle = eVideo.querySelector('.video-oTitle .video-content')
      const tTitle = title || name || '(Unknown title)'
      const tRuntime = runtime ? `${runtime} mins` : null
      const tCountries = Array.isArray(productionCountries) ? productionCountries.map(pItem => pItem.name).join(', ') : null

      eVideo.dataset['index'] = rKey

      if (isIndexed) {
        removeClass(eDel, 'hidden')
        eCheck.disabled = true
      }
      !isIndexed && addClass(eDel, 'hidden')

      if (tTitle) {
        eTitle.innerHTML = tTitle
      }
      // console.log(`handleVideoItemHtml tTitle:::::::::${tTitle}`)
      eCover.src = rItem.coverUrl
      eType.innerHTML = mediaType || rItem.mediaType || ''
      eSynopsis.innerHTML = overview
      eYear.innerHTML = releaseDate || firstAirDate || ''
      eOTitle.innerHTML = originalTitle || originalName || ''

      if (tRuntime) {
        removeClass(eVideo.querySelector('.video-runtime'), 'hidden')
        eRuntime.innerHTML = tRuntime
      }

      if (tCountries) {
        removeClass(eVideo.querySelector('.video-countries'), 'hidden')
        eCountries.innerHTML = tCountries
      }

      const tCast = rItem.cast || []
      const hasCast = tCast.length > 0
      const eCredits = eVideo.querySelector('.video-credits')
      console.log('???????????????????????? ============', rItem)
      hasCast ? removeClass(eCredits, 'hidden') : addClass(eCredits, 'hidden')
    })
  }

  handleVideoItemHtml()
  const { name = '', drive_label, driveLabel } = DATA_HELPERS.queryVideoItem || {}
  const eWrapper = document.querySelector('.videos-content-wrapper')
  const eQuery = document.querySelector('.video-query-title')
  const eLabel = document.querySelector('.video-dLabel')
  eQuery.innerHTML = name
  eLabel.innerHTML = driveLabel || drive_label || ''

  if (eWrapper.scrollTop !== 0 && !doAppend) {
    eWrapper.scrollTo(0, 0)
  }

  if (!showResearch) {
    const eResearch = document.querySelector('.videos-research')
    const eTitles = document.querySelector('.videos-query-titles')
    const titlesHtml = eTitles.innerHTML
    if (!titlesHtmlBackup) {
      titlesHtmlBackup = titlesHtml
    }
    eTitles.innerHTML = ''

    generateItemsHtml({
      eHost: eTitles,
      childHtml: titlesHtmlBackup,
      dataLen: pQuery.length,
    })
    const eTitleWrapper = [...document.querySelectorAll('.videos-query-titleRow')]
    eTitleWrapper.forEach((pItem, pKey) => {
      const eTitleCkbox = pItem.querySelector('input[name="qTitleCk"]')
      const eTitleInput = pItem.querySelector('input[name="qTitle"]')
      eTitleInput.value = pQuery[pKey].title
      if (currentQuery === eTitleInput.value) {
        eTitleCkbox.checked = true
      }

    })
  }

  showResearch = true
}

function onModalLoad () {
  const eModal = document.querySelector('.modal')

  eModal.addEventListener('click', (evt) => {
    isOpened = hasClass(eModal, 'open')
    const eTarget = evt.target
    isOpened && hasClass(eTarget, 'modal') && handleModalStyle(GLOBAL_DEF.lastModalType, 'close')
  })
}

function uncheckAll () {
  const eItems = [...document.querySelectorAll('.video-item')]
  if (!eItems.length) return false

  eItems.forEach(eItem => {
    const eCheck = eItem.querySelector('input[type="checkbox"]')
    if (eCheck.checked) {
      eCheck.checked = false
    }
  })
}

function videoMatch () {
  const eItems = [...document.querySelectorAll('.video-item')]
  const eSelect = eItems.filter(item => item.querySelector('input[type="checkbox"]').checked)
  let tMsg = ''

  if (!eSelect.length) {
    tMsg = LNG.haveNotSelectAny
  }
  if (!tMsg && eSelect.length > 1) {
    tMsg = LNG.selectOnlyOne
  }
  if (tMsg) {
    return handleToast({ msg: tMsg, showToast: true })
  }

  const itemIndex = eItems.findIndex(item => item.querySelector('input[type="checkbox"]').checked)

  const vItem = DATA_HELPERS.queriedVideos[itemIndex]
  const rootEl = document.querySelector('.videos.modal-type')
  const refItemElIndex = rootEl && rootEl.dataset.refitemelindex
  return apiRequest({
    uri: apiUris.video,
    method: 'POST',
    sendData: {
      fileId: DATA_HELPERS.queryVideoItem.id,
      video: vItem
    },
    onData: (res) => {
      if (res.errors) {
        const isStr = (typeof res.errors === 'string')
        const errmsg = isStr ? res.errors : Object.values(res.errors)[0]
        return handleToast({ msg: errmsg, showToast: true })
      }
      if (refItemElIndex) {
        const fileEl = document.querySelector(`.row.hdd-item[data-index="${refItemElIndex}"]`)
        if (fileEl) {
          handleVideoInfoElement({rootEl: fileEl, vInfo: res.response})
        }
      }
      reSearch({ reload: true, refItemElIndex })
      return handleToast({ msg: LNG.upSuccessfully, showToast: true })
    }
  })
}

function reSearch (params)  {
  params = params || {}
  const { queryName, page, reload } = params
  const qClone = {id: DATA_HELPERS.queryVideoItem.id}

  if (page) {
    qClone.page = page + 1

    if (queryName) {
      qClone.useTitle = queryName
    }
  }

  if (!page && !reload) {
    const eTitleInputCks = [...document.querySelectorAll('input[name="qTitleCk"]')]
    const eTitleChecked = eTitleInputCks.filter(eItem => eItem.checked)
    if (!eTitleChecked.length) {
      handleToast({
        showToast: true,
        msg: LNG.selectATitleToContinue
      })
      return false
    }
    const eItem = eTitleChecked[0]
    const eInput = eItem.parentNode.querySelector('input[name="qTitle"]')
    const tVal = eInput.value
    const isValid = (typeof tVal === 'string' && tVal.trim() !== '')
    if (!isValid) {
      return handleToast({
        showToast: true,
        msg: LNG.selectedTitleHasNoValue
      })
    }
    prevQueryName = qClone.useTitle = tVal
    DATA_HELPERS.queriedVideos = []
  }

  qClone.reSearch = reload ? 0 : 1

  apiRequest({
    uri: apiUris.query,
    urlParams: new URLSearchParams(qClone),
    onData: (res) => {
      const mVideo = document.querySelector('.modal .modal-type.videos')
      if (mVideo && !hasClass(mVideo, 'hidden')) {
        videoItems(res)
      }

    }
  })
}

function onDelVideo (params) {
  const tIndex = findAncestor(event.target, 'video-item')
  const vItem = DATA_HELPERS.queriedVideos[tIndex.dataset.index]
  popBox({
    supportCloseBtn: true,
    msg: LNG.sureToRemoveThisAssociation,
    onOk () {
      apiRequest({
        uri: apiUris.video,
        sendData: {
          fileId: vItem.fileId,
          videoId: vItem.mediaid,
        },
        method: 'delete',
        onData: (res) => {
          if (!res.errors) {
            handleToast({
              showToast: true,
              msg: LNG.delSuccessfully
            })
            reSearch({ reload: true })
            const elSummary = document.querySelector(`.hdd-item[data-fileid="${vItem.fileId}"] .v-summary[data-mediaid="${vItem.mediaid}"]`)
            elSummary && elSummary.parentNode.removeChild(elSummary)
          }
        }
      })
    }
  })
}

function showCredits () {
  const labelShow = LNG.Show
  const labelHide = LNG.Hide
  const eBtn = event.target
  const text = eBtn.textContent
  const doShow = (text.toLowerCase() === labelShow.toLowerCase())
  const tLabel = doShow ? labelHide : labelShow
  eBtn.textContent = tLabel

  const eCredits = eBtn.closest('.video-credits')
  const eRows = eCredits.querySelector('.video-credits-rows')
  const eVideo = eCredits.closest('.video-item')

  doShow ? removeClass(eRows, 'hidden') : addClass(eRows, 'hidden')

  if (!doShow) return false

  const renderedBefore = eVideo.querySelector('.video-credits-row .video-credit-name').innerHTML

  if (renderedBefore.trim() !== '') return false

  const tIndex = eVideo.dataset.index
  const videoItem = DATA_HELPERS.queriedVideos[tIndex]


  const list = videoItem.cast
  const rowHtml = eRows.innerHTML
  console.log(`showCredits videoItem `, videoItem, list.length)
  generateItemsHtml({
    eHost: eRows,
    childHtml: rowHtml,
    dataLen: 1,
  })

  const newRows = [...eVideo.querySelectorAll('.video-credits-row')]
  newRows.forEach((rItem, rKey) => {
    const tList = list[rKey]
    const itemHtml = rItem.innerHTML
    generateItemsHtml({
      eHost: rItem,
      childHtml: itemHtml,
      dataLen: list.length,
    })

    const eItems = [...rItem.querySelectorAll('.video-credit')]

    eItems.forEach((eItem, eKey) => {
      const eImg = eItem.querySelector('.video-credit-img')
      const eName = eItem.querySelector('.video-credit-name')
      const eRole = eItem.querySelector('.video-credit-role')

      const itemContent = list[eKey]
      const { name, character, job, avatarUrl, id } = itemContent
      // console.log(sCredits, id, tCast.map(tItem => tItem.id))
      if (avatarUrl) {
        eImg.style.backgroundImage = `url('${avatarUrl}')`
      }

      eName.innerHTML = name
      eRole.innerHTML = job || character || ''
    })
  })
}

function popBox ({noButton, supportCloseBtn, labelOk, labelCancel, msg, onOk, onCancel, onRenderMsg}) {
  const cls = 'pop-box'
  const el = document.querySelector('.' + cls)
  const winW = document.body.clientWidth
  const winH = document.body.clientHeight
  const contW = winW * 0.8
  const maxH = winH * 0.8

  if (el) {
    return false
  }
  const div = document.createElement('div')
  div.className = cls

  const overlay = document.createElement('div')
  overlay.className = 'pop-box-overlay'

  const container = document.createElement('div')
  container.className = 'pop-box-container'

  const content = document.createElement('div')
  content.className = 'pop-box-content'
  content.style.width = contW

  const btnWp = document.createElement('div')
  btnWp.className = 'pop-box-btnWp'

  const msgWp = document.createElement('div')
  msgWp.className = 'pop-box-msgWp'
  msgWp.style.maxHeight = maxH

  const msgSpan = document.createElement('span')
  msgSpan.className = 'pop-box-msg'

  if (msg) {
    msgSpan.innerHTML = msg
  }

  if (!noButton) {
    const btnOk = document.createElement('div')
    btnOk.className = 'pop-box-btn btn-ok'
    btnOk.innerHTML = labelOk || LNG.OK || 'Okay'
    btnWp.appendChild(btnOk)

    btnOk.addEventListener('click', () => {
      closePopBox({onClosing: onOk})
    })

    if (supportCloseBtn) {
      const btnCancel = document.createElement('div')
      btnCancel.className = 'pop-box-btn btn-cancel'
      btnCancel.innerHTML = labelCancel || LNG.Cancel || 'Cancel'
      btnWp.appendChild(btnCancel)
      btnCancel.addEventListener('click', () => {
        closePopBox({onClosing: onCancel})
      })
    }
  }

  document.body.appendChild(div)
  div.appendChild(overlay)
  div.appendChild(container)
  container.appendChild(content)
  content.appendChild(msgWp)
  content.appendChild(btnWp)
  msg && msgWp.appendChild(msgSpan)
  onRenderMsg && onRenderMsg({msgWp})
}

function closePopBox (params) {
  const {onClosing} = params
  const el = document.querySelector('.pop-box')
  onClosing && onClosing()
  if (el) {
    el.parentNode.removeChild(el)
  }
}
