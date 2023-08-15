const { app, BrowserWindow, screen } = require("electron")
const {checkServerConf, onWindowResizeOrMove, restoreWindowPosition} = require('./src/utils/fileData')

async function createWindow() {
  require('./src/bin/server')
  await checkServerConf()
  // Create the browser window.
  const {APP_COMMON_CONF, APP_OTHER_CONF} = require('./src/constant/common')
  console.debug(`ElectronMain APP_COMMON_CONF: `, JSON.stringify(APP_COMMON_CONF))

  const resDimension = await restoreWindowPosition({displays: screen.getAllDisplays()})
  const sPort = APP_COMMON_CONF.serverConf.server.port ? `:${APP_COMMON_CONF.serverConf.server.port}` : ''
  const mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: false,
    },
    ...resDimension,
  });

  const url = `http://${APP_COMMON_CONF.serverConf.server.host}${sPort}`
  console.log(`URL will be: `, url)
  mainWindow.loadURL(url)
  mainWindow.setMenu(null)
  mainWindow.on('resize', () => {
    onWindowResizeOrMove({mainWindow, evtName: 'resize'})
  })
  mainWindow.on('move', () => {
    onWindowResizeOrMove({mainWindow, evtName: 'move'})
  })
  mainWindow.on('close', () => {
    onWindowResizeOrMove({mainWindow, evtName: 'close'})
  })
  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
