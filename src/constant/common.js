
const APP_COMMON_CONF = {
  appDataDirName: 'storage_data_manager',
  dbFileName: 'db.sqlite3',
  extraDataFileName: 'hdd-extra-data.json',
  DATA: {},
  locales: [
    {id: 'en', name: 'English'},
    {id: 'zh-cn', name: '简体中文'},
  ],
  serverIsReady: 0,
  serverConf: null,
  dbFilePath: null,
  extraDataFilePath: null,
  hasWritingPermission: false,
}
const APP_OTHER_CONF = {
  lastTimeSyncPosition: null,
}
module.exports = {
  APP_COMMON_CONF, APP_OTHER_CONF
}
