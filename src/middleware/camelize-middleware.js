const humps = require("humps")
const _ = require("lodash")

module.exports = async function(ctx, next) {
  await next()
  const isStaticPath = /\/medias/ig.test(ctx.path)
  if (ctx.body && _.isObjectLike(ctx.body) && !isStaticPath && !ctx.state.doNotTrans) {
    ctx.body = humps.camelizeKeys(ctx.body)
  }
}
