const config = require("electron-node-config")
const jwt = require("jsonwebtoken")

const userPick = ({ id, username }) => ({ id, username })
function generateJWTforUser(user = {}) {
  return Object.assign({}, user, {
    token: jwt.sign(
      {
        sub: userPick(user),
      },
      config.get("secret"),
      {
        expiresIn: "7d",
      },
    ),
  })
}

exports.generateJWTforUser = generateJWTforUser
