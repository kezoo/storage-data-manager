const path = require('path')
const fs = require('fs')
const {APP_COMMON_CONF} = require('../constant/common')
const {getValue, isObject} = require('../utils/basicHelpers')

function getLocaleData () {
  const dirPath = path.join(__dirname, '../../data/localization')
  const files = fs.readdirSync(dirPath, 'utf8')

  for (const file of files) {
    const localeName = file.substring(0, file.lastIndexOf('.'))
    const fPath = path.join(dirPath, file)
    const fData = require(fPath)
    APP_COMMON_CONF.DATA[localeName] = fData
  }
}
function tl (params) {
  const {key, rep, locale} = params || {}
  const locales = Object.keys(APP_COMMON_CONF.DATA)
  const lKey = locale && locales.includes(locale) ? locale : locales[0]
  const lData = APP_COMMON_CONF.DATA[lKey]
  const tValue = getValue(lData, key.split('.'))

  let t = tValue || ''
  if (['string', 'number'].includes(typeof rep)) {
    t = t.replace(/%s/ig, rep)
  }
  if (isObject(rep)) {
    t = formatWithObject(t, rep, allowEmpty)
  }
  return t || key
}
const Object_INDEX_RE = /\{(.+?)\}/g
function formatWithObject (text, values)    {
  const tTrans = text.replace(/\{\{/g, '{').replace(/\}\}/g, '}')
  return tTrans.replace(Object_INDEX_RE, (original, matched) => {
    const value = values[matched]
    if (value !== null && typeof value !== 'undefined') {
      return value
    }
    return original
  })
}

module.exports = {getLocaleData, tl}
