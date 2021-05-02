import {
  query as q,
  Collection,
  Index,
  Role,
} from '@triangularcube/fauna-pulumi-provider'

const users = new Collection('users')

const memberRole = new Role(
  'p-role',
  {
    privileges: [
      {
        resource: q.Collection('users'),
        actions: {
          create: q.Query(data =>
            q.Select(['data', 'email'], q.Get(q.CurrentIdentity()))
          ),
          write: q.Query((oldData, newData) =>
            q.And(
              q.Equals(
                q.CurrentIdentity(),
                q.Select(['data', 'owner'], oldData)
              ),
              q.Equals(
                q.Select(['data', 'owner'], oldData),
                q.Select(['data', 'owner'], newData)
              )
            )
          ),
        },
      },
    ],
  },
  {
    dependsOn: [users],
  }
)

export const priv = memberRole.privileges
