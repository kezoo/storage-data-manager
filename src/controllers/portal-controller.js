const {APP_COMMON_CONF} = require('../constant/common')

async function getIndex (ctx) {
  try {
    await ctx.render('index', {serverConf: JSON.stringify(APP_COMMON_CONF.serverConf || {})})
  }
  catch (err) {
    console.error(err)
    ctx.body = ''
  }
}

module.exports = {
  getIndex,
}
