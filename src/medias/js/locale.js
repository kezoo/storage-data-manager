function assignLocale () {
  const elements = Array.from(document.querySelectorAll('*[data-locale]'))
  const changeVal = ({element, text, placeholder, value}) => {
    if (text) {
      element.textContent = text
    }
    if (placeholder) {
      element.setAttribute('placeholder', placeholder)
    }
    if (value) {
      element.value = value
    }
  }
  for (const el of elements) {
    const localeKey = el.dataset.locale

    if (!localeKey) {
      continue
    }
    const isJson = validJson(localeKey)
    const obj = isJson ? JSON.parse(localeKey) : {}
    const tagName = el.nodeName
    const textKey = obj.key || localeKey
    const textContent = LNG[textKey] || ''
    const placeholder = obj.placeholderKey && LNG[obj.placeholderKey]
    const value = obj.valueKey && LNG[obj.valueKey]
    // console.log(`assignLocale textKey:${textKey} textContent:${textContent}`)
    changeVal({
      element: el,
      text: textContent,
      placeholder,
      value,
    })
  }
}

function onSelectLanguage () {
  const val = event.target.value
  const langs = GLOBAL_DEF.availableLocales
  const fCode = langs.find(fItem => fItem.id === val)
  if (fCode) {
    apiRequest({
      uri: `/change-lang`,
      urlParams: {locale: fCode.id},
      onData (data) {
        const {localeData, locales} = data
        if (localeData) {
          GLOBAL_DEF.locale = fCode.id
          GLOBAL_DEF.availableLocales = locales
          Object.assign(LNG, localeData)
          handleGlobalData({doSave: true})
          addHeaderProp()
          assignLocale()
          handleToast({msg: LNG.upLanguageTip, showToast: true})
        }
      }
    })
  }
}
