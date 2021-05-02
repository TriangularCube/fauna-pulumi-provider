# FaunaDB Dynamic Provider for Pulumi

Experimental FaunaDB Dynamic Provider for Pulumi. The goal of this
library is to provide a simple way to provision and maintain resources
in FaunaDB, using Typescript/Javascript, with Pulumi.

## How to use

First, you need to install the Pulumi CLI in your system. This CLI will be needed
to create any resources. Please refer to this
[link](https://www.pulumi.com/docs/reference/cli/).

You can install this library using npm:

```
npm install @triangularcube/fauna-pulumi-provider
```

After installation, you will need to configure access to
FaunaDB using an access key.

_NOTE: To create roles in FaunaDB, an Admin Key is required, otherwise
a Server Key is preferred (for security reasons)._

This library will look for the key in the environment variable `FAUNA_ADMIN_KEY`.
Once Pulumi starts supporting stack configurations in dynamic providers, this library
will fallback to a key in the stack configuration.

This library also re-exports FaunaDB query object, so users don't have to
import the FaunaDB JS driver manually.

## API

Collections:

```ts
import { Collection, query as q } from '@triangularcube/fauna-pulumi-provider'

const collection = new Collection('myCollection', {
  // All fields optional

  name: string, // inferred from logical name if missing
  history_days: number, // Defaults to 30
  ttl_days: number | null, // Defaults to null
  data: {
    // This is an arbitrary object
  },
})

export const collectionName = collection.name
export const collectionTs = collection.ts
export const collectionHistoryDays = collection.history_days
export const collectionTtlDays = collection.ttl_days
```

Indexes:

```ts
import { Collection, Index } from '@triangularcube/fauna-pulumi-provider'

const myCollection = new Collection('my-collection')

const index = new Index(
  'my-index',
  {
    // Required
    source: myCollection.name,

    // Optional
    name: 'my-index', // inferred from logical name if missing
    terms: [
      {
        binding: 'my-binding-name',
      },
      // And / Or
      {
        field: ['data', 'my-field'],
      },
    ],
    values: [
      {
        binding: 'my-binding-name',
      },
      // And / Or
      {
        field: ['data', 'my-field'],
      },
    ],
    unique: boolean, // Defaults to false
    serialized: boolean, // Defaults to true
    data: {
      description: 'This is an arbitrary object',
    },
  },
  {
    // Index will fail to create if collection doesen't already exist
    dependsOn: [myCollection],
  }
)

export const indexTs = index.ts
export const indexPartitions = index.partitions
```

Since wrapping names into `Ref`s are trivial, this library can accept
either a string or a Ref Expr for `soruce`

```ts
{
  source: 'name-string'
}

// Or

import { query as q } from '@triangularcube/fauna-pulumi-provider'
{
  source: q.Collection('collection-name')
}

// Or
import { query as q } from '@triangularcube/fauna-pulumi-provider'
{
  source: [
    {
      collection: 'collection-name',
      // Or:
      collection: q.Collection('collection-name'),

      // and optionally
      fields: {
        binding1: q.Query(
          q.Lambda(
            ...
          )
        ),
        binding2: ...
      }
    }
  ]
}
```

Roles:

```js
import { Role, query as q } from '@triangularcube/fauna-pulumi-provider'

const role = new Role('my-role', {
  // Required
  privileges: [
    {
      resource: q.Collection('my-collection'),
      actions: {
        // All fields optional, but unless at least
        //  one option is set the creation will fail

        // Each option takes either a boolean
        create: boolean,
        // Or a function
        create: q.Query(
          q.Lambda(
            // This will grant Create privilege if 'some-field' on the
            //   currently logged in user is true
            ref => q.Select(
              ['data', 'some-field'],
              q.Get(
                q.CurrentIdentity()
              )
            )
          )
        ),

        // Same pattern apply to the rest of the options
        // Please refer to FaunaDB documentation for exact function parameters
        delete: ...,
        read: ...,
        write: ...,
        history_read: ...,
        history_write: ...,
        unrestricted_read: ...,
        call: ...,
      },
    },
  ],

  // Optional
  name: 'my-role', // Inferred from logical name if missing
  membership: [
    {
      // Required
      resource: q.Collection('some-other-collection'),

      // Optional
      predicate: q.Query(
        ref => q.Select(
          ['data', 'some-field'],
          q.Get(ref),
          true, // Grant access only if 'some-field' on the user is 'true'
        )
      )
    }
  ]
})
```

## Note
Due to the way FaunaDB driver operates, it is impossible for this library to validate
the inputs, therefore FaunaDB errors will be thrown if any errors occur due to 
invalid configuration.

## TODOs

- Functions
- Documents
- Tokens
