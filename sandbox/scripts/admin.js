const { Client, query } = require('faunadb')
const q = query

require('dotenv').config()

const client = new Client({ secret: process.env.FAUNA_ADMIN_KEY })

const doStuff = async () => {
  try {
    // const response = await client.query(
    //   q.Let(
    //     { map: q.Get(q.Ref(q.Collection('maps'), '297900152506548746'))},
    //     q.Or(
    //       q.Select(['data', 'public'], q.Var('map')),
    //       q.Equals(
    //         q.Select(['data', 'creator'], q.Var('map')),
    //         q.Ref(q.Collection('users'), '297900220992193034')
    //       )
    //     )
    //   )
    // )

    // const response = await client.query(
    //   q.Let(
    //     { map: q.Get(q.Ref(q.Collection('maps'), '297900152506548746'))},
    //     q.Select(['data', 'public'], q.Var('map'), false)
    //   )
    // )

    const response = await client.query(
      q.Call(q.Function('create-map'), 'some-name')
    )

    console.log(response)

  } catch (error) {
    console.error(error)
  }
}

doStuff()

