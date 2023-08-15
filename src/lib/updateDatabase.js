const db = require("../lib/db")
const {handleExtraJson,} = require('../utils/fileData')
const {toIsoString, countOccurrences} = require('../utils/basicHelpers')
const assert = require('http-assert')

async function updateDatabase () {
  const updates = [
    {
      name: 'AddArtist',
      up: async function (params) {
        console.log(`Updating AddArtist ------------------ `)
        db.schema.hasTable('video_artist').then(function (exists) {
          if (!exists) {
            return db.schema.createTable('video_artist', function (t) {
              t.integer('id').primary()
              t.string('name')
              t.string('original_name')
              t.string('profile_path')
              t.string('avatar')
            })
          }
        })
      }
    },
    {
      name: 'AddCast',
      up: async function (params) {
        console.log(`Updating AddCast   ------------------ `)

        db.schema.hasTable('cast').then(function (exists) {
          if (!exists) {
            return db.schema.createTable('cast', function (t) {
              t.increments('id').primary()
              t.integer('artist_id')
              t.integer('video_id')
              t.string('name')
              t.string('original_name')
              t.decimal('popularity', 12, 3)
              t.integer('gender')
              t.integer('adult')
              t.string('known_for_department')
              t.string('department')
              t.string('job')
              t.string('profile_path')
              t.string('credit_id')
              t.json('extra')
              t.timestamps(true, true)
            })
          }
        })
      }
    },
    {
      name: 'AddVideoCover',
      up: async function (params) {
        console.log(`Updating AddVideoCover   ------------------ `)

        db.schema.hasColumn('videos', 'cover').then(function (exists) {
          if (!exists) {
            return db.schema.table('videos', function (t) {
              t.string('cover')
            })
          }
        })
      }
    },
    {
      name: 'VideoGrabbedCastFlag',
      up: async function (params) {
        console.log(`Updating VideoGrabbedCastFlag   ------------------ `)

        db.schema.hasColumn('videos', 'grabbed_cast').then(function (exists) {
          if (!exists) {
            return db.schema.table('videos', function (t) {
              t.integer('grabbed_cast')
            })
          }
        })
      }
    }
  ]

  const {dupMax} = countOccurrences({list: updates})
  assert(!dupMax, 'updateDatabase: Contains dup item ')

  const {dbUpdates = []} = await handleExtraJson()

  for (let i = 0; i < updates.length; i++) {
    const {name, up, preHandler} = updates[i]

    const findUp = dbUpdates.find(item => item.name === name)
    if (findUp) {
      console.log(`Already updated this ${name} ${findUp.updatedAt}`)
      continue
    }

    const preHandlerRes = preHandler && (await preHandler())
    const upRes = await up({preHandlerRes})

    dbUpdates.push({
      name,
      updatedAt: toIsoString(new Date()),
    })
  }
  await handleExtraJson({toUp: {dbUpdates}})
}

module.exports = {
  updateDatabase,
}
