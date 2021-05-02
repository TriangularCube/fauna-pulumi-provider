const { Client, query } = require('faunadb')
const q = query

require('dotenv').config()

console.log(q.Collection('users'))

const client = new Client({ secret: process.env.FAUNA_ADMIN_KEY })

client.query(
  q.CreateRole({
    name: 'q-role',
    privileges: [{
      resource: q.Collection('users'),
      actions: {
        create: true
      }
    }]
  })
)
