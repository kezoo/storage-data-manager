function removeInvalidKeys (params) {
  const keys = Object.keys(params)

  for (const key of keys) {
    const kVal = params[key]
    const invalid = typeof kVal === 'undefined' || kVal === null
    invalid && delete params[key]
  }
}

function cloneObj (obj) {return JSON.parse(JSON.stringify(obj))}
function chunk(p) {
  const {list, chunkSize} = p;
  const arr = [];
  if (chunkSize) {
    for (let i = 0; i < list.length; i += chunkSize) {
      arr.push(list.slice(i, i + chunkSize));
    }
  }
  return arr;
}
function byteLength (str) {
  let s = str.length
  for (let i = str.length - 1; i >= 0; i--) {
    const code = str.charCodeAt(i)
    if (code > 0x7f && code <= 0x7ff) {
      s++
    }
    else if (code > 0x7ff && code <= 0xffff) {
      s += 2
    }
    if (code >= 0xDC00 && code <= 0xDFFF) {
      i--
    }
  }
  return s
}

function objToUrlParams (obj) {
  const keys = Object.keys(obj)
  const urlParams = keys.reduce((str, key) => {
    const val = obj[key]
    if (val) {
      str += `${str ? '&' : ''}${key}=${val}`
    }
    return str
  }, '')
  return urlParams
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
function isObject (obj) {
  const type = typeof obj
  return type === 'object' && !!obj && !Array.isArray(obj) && typeof obj !== 'function'
}
function fileSize (bytes, options) {

  var units = 'BKMGTPEZY'.split('')
  function equals (a, b) { return a && a.toLowerCase() === b.toLowerCase() }

  bytes = typeof bytes == 'number' ? bytes : 0
  options = options || {}
  options.fixed = typeof options.fixed == 'number' ? options.fixed : 2
  options.spacer = typeof options.spacer == 'string' ? options.spacer : ' '

  options.calculate = function (spec) {

    var type = equals(spec, 'si') ? ['k', 'B'] : ['K', 'iB']
    var algorithm = equals(spec, 'si') ? 1e3 : 1024
    var magnitude = Math.log(bytes) / Math.log(algorithm)|0
    var result = (bytes / Math.pow(algorithm, magnitude))
    var fixed = result.toFixed(options.fixed)
    var suffix

    if (magnitude-1 < 3 && !equals(spec, 'si') && equals(spec, 'jedec'))
      type[1] = 'B'

    suffix = magnitude
      ? (type[0] + 'MGTPEZY')[magnitude-1] + type[1]
      : ((fixed|0) === 1 ? 'Byte' : 'Bytes')

    return {
      suffix: suffix,
      magnitude: magnitude,
      result: result,
      fixed: fixed,
      bits: { result: result/8, fixed: (result/8).toFixed(options.fixed) }
    }
  }

  options.to = function (unit, spec) {
    var algorithm = equals(spec, 'si') ? 1e3 : 1024
    var position = units.indexOf(typeof unit == 'string' ? unit[0].toUpperCase() : 'B')
    var result = bytes

    if (position === -1 || position === 0) return result.toFixed(2)
    for (; position > 0; position--) result /= algorithm
    return result.toFixed(2)
  }

  options.human = function (spec) {
    var output = options.calculate(spec)
    return output.fixed + options.spacer + output.suffix
  }

  return options;
}
function chunk (p) {
  const {list, chunkSize} = p
  const arr = []
  if (chunkSize) {
    for (let i = 0; i < list.length; i += chunkSize) {
      arr.push(list.slice(i, i + chunkSize))
    }
  }
  return arr
}
function cleanFileName (fName) {
  let nNames = []
  try {
    const method = require('./cleanFileName')
    if (typeof method === 'function') {
      nNames = method(fName)
    }
  }
  catch (err) {
    console.error(`ERROR:::::::::`, err)
  }
  return nNames
}
function getValue (obj, route) {
  if (!obj) return false
  if (!Array.isArray(route) || !route.length) return false

  let returnValue = ''

  route.forEach((item) => {
    if (isObject(obj) && obj.hasOwnProperty(item)) {
      obj = obj[item]
      returnValue = obj
    }
    else {
      obj = false
      returnValue = ''
    }

  })

  return returnValue

}
function urlParamsToObj (params) {
  const obj = {}
  const sStringSplits = params.split('&').filter(item => item.trim() !== '')

  sStringSplits.forEach(item => {
    const equalIndex = item.indexOf('=')
    const hasSign = equalIndex >= 0
    const prop =  item.substring(0, hasSign ? equalIndex : item.length)
    const propVal = hasSign ? item.substring(equalIndex + 1) : ''
    obj[prop] = decodeURIComponent(propVal)
  })
  return obj
}

function toIsoString(date) {
  var tzo = -date.getTimezoneOffset(),
      dif = tzo >= 0 ? '+' : '-',
      pad = function(num) {
          return (num < 10 ? '0' : '') + num;
      };

  return date.getFullYear() +
      '-' + pad(date.getMonth() + 1) +
      '-' + pad(date.getDate()) +
      'T' + pad(date.getHours()) +
      ':' + pad(date.getMinutes()) +
      ':' + pad(date.getSeconds()) +
      dif + pad(Math.floor(Math.abs(tzo) / 60)) +
      ':' + pad(Math.abs(tzo) % 60);
}
function countOccurrences (params) {
  const {list, asPropName = 'name'} = params || {}
  const findDup = list
      .reduce((dupRes, item) => {
        const isItemObj = typeof item === 'object'
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
  // console.log(`countOccurrences RES `, res)
  return res
}
function objectPickKeys (obj, keys) {
  const objToReturn = {}
  Object.keys(obj).forEach(key => {
    if (keys.includes(key)) {
      objToReturn[key] = obj[key]
    }
  })
  return objToReturn
}

function objectOmitKeys (obj, keys) {
  Object.keys(obj).forEach(key => {
    if (keys.includes(key)) {
      delete obj[key]
    }
  })
  return obj
}
module.exports = {
  removeInvalidKeys, cloneObj, byteLength, objToUrlParams, chunk,
  validJson, fileSize, chunk, cleanFileName, getValue, isObject,
  urlParamsToObj, toIsoString, countOccurrences, objectPickKeys, objectOmitKeys
}
