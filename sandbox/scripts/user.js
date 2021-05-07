const { Client, query } = require('faunadb')
const q = query

require('dotenv').config()

const client = new Client({ secret: process.env.FAUNA_USER_KEY })
// const client = new Client({ secret: process.env.FAUNA_ADMIN_KEY })

const doStuff = async () => {
  try {
    // const response = await client.query(
    //   q.Paginate(q.Documents(q.Collection('maps')))
    // )

    // const response = await client.query(
    //   q.Select(['data', 'creator'], q.Get(q.Ref(q.Collection('maps'), "297900152506548746")))
    // )

    // const response = await client.query(
    //   q.CurrentIdentity()
    // )

    const response = await client.query(
      q.Call('create-map', 'some-name')
    )

    console.log(response)
  } catch (error) {
    console.error(error)
  }
}

doStuff()
