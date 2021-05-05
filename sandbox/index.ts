import {
  query as q,
  Collection,
  Index,
  Role,
  Function,
  Document,
  Token,
} from 'fauna-pulumi-provider'

const users = new Collection('users')

// const userByEmail = new Index(
//   'user-by-email',
//   {
//     source: q.Collection('users'),
//   },
//   {
//     dependsOn: [users],
//   }
// )

// const memberRole = new Role(
//   'p-role',
//   {
//     privileges: [
//       {
//         resource: q.Collection('users'),
//         actions: {
//           create: q.Query(data =>
//             q.Select(['data', 'email'], q.Get(q.CurrentIdentity()))
//           ),
//           write: q.Query((oldData, newData) =>
//             q.And(
//               q.Equals(
//                 q.CurrentIdentity(),
//                 q.Select(['data', 'owner'], oldData)
//               ),
//               q.Equals(
//                 q.Select(['data', 'owner'], oldData),
//                 q.Select(['data', 'owner'], newData)
//               )
//             )
//           ),
//         },
//       },
//     ],
//     membership: [
//       {
//         resource: q.Collection('users'),
//         predicate: q.Query(
//           q.Lambda(ref => q.Select(['data', 'not-vip'], q.Get(ref)))
//         ),
//       },
//       {
//         resource: q.Collection('users'),
//         predicate: q.Query(
//           q.Lambda(ref => q.Select(['data', 'vip'], q.Get(ref)))
//         ),
//       },
//     ],
//   },
//   {
//     dependsOn: [users],
//   }
// )
//
// const func = new Function('test-function', {
//   body: q.Query(q.Lambda('number', q.Add(1, q.Var('number')))),
// })

const doc = new Document(
  'doc1',
  {
    collection: users.name!,
    data: {
      something: 'yi',
    },
  },
  {
    dependsOn: [users],
  }
)

// const token = new Token('token-1', {
//   instance: q.Ref(q.Collection('users'), '123')
// })
