# Faunadb Dynamic Provider for Pulumi

Experimental FaunaDB Dynamic Provider for Pulumi. The goal of this
library is to provide a simple way to provision and maintain resources
in FaunaDB, using Typescript/Javascript, with Pulumi.

## How to use
First, you need to install the Pulumi CLI in your system. This CLI will be needed to create any resources. Please refer to this [link](https://www.pulumi.com/docs/reference/cli/).

You can install this library using npm:

```
npm install faunadb-pulumi-provider
```

After installation, you will need to configure access to
FaunaDB using an access token.

_Note: As currently this project only supports the creation of Collections and Indexes, you will require a Server Access Key. As more features are implemented you may need to use an Admin Key to configure roles._

This library will look for the key in the environment variable `FAUNA_KEY`. Once Pulumi starts supporting stack configurations in dynamic providers, this library will fallback to a key in the stack configuration.

## API
Collections:
```ts
import { Collection, query as q } from 'faunadb-pulumi-provider'

const collection = new Collection('myCollection', {
  // All fields optional

  name: 'myCollection', // inferred from logical name if missing
  history_days: 30,
  ttl_days: null,
  data: {
    description: 'This is an arbitrary object'
  }
})

export const collectionName = collection.name
export const collectionTs = collection.ts
export const collectionHistoryDays = collection.history_days
export const collectionTtlDays = collection.ttl_days
```

Indexes:
```ts
import { Index } from 'faunadb-pulumi-provider'

const index = new Index('myIndex', {
  // Required
  source: myCollection.name

  // Optional
  name: 'my-index' // inferred from logical name if missing
  terms: [
    {
      binding: 'my-binding-name'
    },
    // And / Or
    {
      field: ['data', 'my-field']
    }
  ],
  values: [
    {
      binding: 'my-binding-name'
    },
    // And / Or
    {
      field: ['data', 'my-field']
    }
  ],
  unique: true, // Defaults to false
  serialized: false, // Defaults to true
  data: {
    description: 'This is an arbitrary object'
  }
})

export const indexTs = index.ts
export const indexPartitions = index.partitions
```
`source` is the only field to significantly deviate from faunadb. Since wrapping names into `Ref`s are trivial, this library has opted to use names instead. So `source` will take
```ts
{
  source: 'name-string'
}

// Or
import { query as q } from 'faunadb-pulumi-provider'
{
  source: [
    {
      collection: 'collection-name',
      
      // and optionally
      fields: {
        binding1: q.Query(
          q.Lambda(
            ...
          )
        )
        binding2: ...
      }
    }
  ]
}
```

## TODOs
- Functions
- Roles
- Documents
- Tokens
- Better input validation
