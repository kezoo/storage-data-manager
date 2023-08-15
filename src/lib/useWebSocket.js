const WebSocket = require('ws');
const {handleWsPathAndCategory} = require('../controllers/fs-controller')
const {urlParamsToObj} = require('../utils/basicHelpers')

function useWebSocket(params) {
  const {server} = params || {}
  const wss = new WebSocket.Server({
    server
  });
  wss.on('connection', async (ws, request) => {
    const req = request
    const fullUrl = req.url
    const indexOfQMark = fullUrl.indexOf('?')
    const hasQMark = indexOfQMark > 0
    const url = hasQMark ? fullUrl.substring(0, indexOfQMark) : fullUrl
    const paramsStr = hasQMark ? fullUrl.substring(indexOfQMark+1, fullUrl.length) : ''
    const paramsObj = urlParamsToObj(paramsStr)

    const findWsRegister = registerWs().find(item => item.path === url)

    if (!findWsRegister) {
      console.log(`CLOSE WS due no register for this path ${url}`)
      return ws.close()
    }
    const {handler} = findWsRegister
    let onReg = typeof handler === 'function' ? handler : null
    let onRecvMsg = null

    if (typeof handler === 'Object') {
      if (handler.onReg) {
        onReg = handler.onReg
      }
      if (handler.onRecvMsg) {
        onRecvMsg = handler.onRecvMsg
      }
    }

    console.log(
      `WebSocket connection URL ${url}
      paramsStr ${paramsStr} ${JSON.stringify(paramsObj)}
      \n findWsRegister ${findWsRegister}
      `, req.headers
    )

    const onListenMsg = (lParams) => {
      const {onCloseWs} = lParams || {}
      ws.on('message', function incoming(message) {
        const doAbort = message.toString() === 'abort'
        console.log('received message ', message.toString(), doAbort);
        onRecvMsg && onRecvMsg({ws, req, message, doAbort})

        if (doAbort) {
          console.log('Close websocket by msg abort')
          ws.close()
          onCloseWs && onCloseWs()
        }
      });
    }

    onReg && onReg({ws, req, onListenMsg, paramsObj})

    onListenMsg()

    // ws.send('something');
  });
}

function registerWs () {
  const wsHandlers = [
    {
      path: '/pathAndCategory',
      handler: handleWsPathAndCategory,
    }
  ]

  return wsHandlers
}

module.exports = useWebSocket
