const { Client, query } = require('faunadb')
const q = query

require('dotenv').config()

const client = new Client({ secret: process.env.FAUNA_ADMIN_KEY })

const doStuff = async () => {
  try {
    const response = await client.query(
      q.Create(q.Collection('test'), { data: { username: 'stuff' } })
    )
    console.log(response.ref.id)
  } catch (error) {
    console.error(error)
  }
}

doStuff()
