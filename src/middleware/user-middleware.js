module.exports = async (ctx, next) => {
  const db = require("../lib/db")
  if (ctx.state.jwt && ctx.state.jwt.sub && ctx.state.jwt.sub.id) {
    ctx.state.user = await db("users")
      .first(
        "id",
        "username",
        "created_at",
        "updated_at",
      )
      .where({ id: ctx.state.jwt.sub.id })
  }
  if (!/\/medias\//.test(ctx.path)) {
    console.log('PARAMS QUERY::::::::::', ctx.query)
    console.log('PARAMS JSON::::::::::', ctx.request.body)
  }
  return next()
}
