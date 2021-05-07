import {
  query as q,
  Collection,
  Index,
  Role,
  Function,
  Document,
  Token,
  Key,
} from 'fauna-pulumi-provider'

const users = new Collection('users')
const maps = new Collection('maps')

const testUser = new Document(
  'test-user',
  {
    collection: 'users',
    params: {
      data: {
        test: 'user',
      },
      credentials: {
        password: 'asdf',
      },
    },
  },
  {
    dependsOn: [users],
  }
)

const token = new Token(
  'test-token',
  {
    instance: q.Ref(q.Collection('users'), testUser.id),
  },
  {
    dependsOn: [testUser],
  }
)

export const tokenSecret = token.secret

const createMapFunction = new Function('create-map', {
  body: q.Query((name: string) =>
    q.Create(q.Collection('maps'), {
      data: {
        name: name,
        creator: q.CurrentIdentity(),
        created: q.ToDate(q.Now()),
      },
    })
  ),
  role: 'server',
})

const userRole = new Role(
  'user-role',
  {
    name: 'user',
    privileges: [
      // A user can read his own maps
      // {
      //   resource: q.Collection('maps'),
      //   actions: {
      //     read: q.Query(ref =>
      //       q.Let(
      //         {
      //           doc: q.Get(ref),
      //         },
      //         q.Or(
      //           q.Select(['data', 'public'], q.Var('doc'), false),
      //           q.Equals(
      //             q.Select(['data', 'creator'], q.Var('doc')),
      //             q.CurrentIdentity()
      //           )
      //           // false
      //         )
      //       )
      //     ),
      //     // create: q.Query(newData =>
      //     //   q.Equals(
      //     //     q.Select(['data', 'creator'], newData),
      //     //     q.CurrentIdentity()
      //     //   )
      //     // ),
      //   },
      // },
      {
        resource: q.Function(createMapFunction.name),
        actions: {
          call: true,
        },
      },
    ],
    membership: [
      {
        resource: q.Collection('users'),
      },
    ],
  },
  {
    dependsOn: [users, maps],
  }
)
