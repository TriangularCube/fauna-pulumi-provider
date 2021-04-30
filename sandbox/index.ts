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
          create: true,
        },
      },
    ],
  },
  {
    dependsOn: [users],
  }
)
