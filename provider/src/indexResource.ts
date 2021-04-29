import * as pulumi from '@pulumi/pulumi'
import { Expr } from 'faunadb'
import { createClient, IndexResponse, q } from './fauna'
import { tryCreate } from './utils/tryCreate'

interface SourceObject {
  collection: string
  fields?: {
    [index: string]: Expr
  }
}

interface BindingValue {
  binding: string
}

interface IndexProviderArgs {
  name: string
  source: string | SourceObject[]
  terms?: (BindingValue | { field: string[] })[]
  values?: (BindingValue | { field: string[]; reverse?: boolean })[]
  unique?: boolean
  serialized?: boolean
  data?: Record<string, unknown>
}

function generateOutput(
  input: IndexProviderArgs,
  response: IndexResponse
): IndexProviderArgs {
  const outs: IndexProviderArgs & { ts: number; partitions: 1 | 8 } = {
    // Will always exist
    name: response.name,
    source: input.source,
    ts: response.ts,
    serialized: response.serialized,
    partitions: response.partitions as 1 | 8,
  }

  // const coercedInput = input as IndexProviderInternalOutput
  const keys = [
    'terms',
    'values',
    'unique',
    'data',
  ] as (keyof IndexProviderArgs)[]
  for (const key of keys) {
    if (input[key] != null) {
      // Sigh, can't make this work with TS
      const coercedOuts = outs as any
      coercedOuts[key] = input[key]
    }
  }

  return outs
}

class IndexResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(
    inputs: IndexProviderArgs
  ): Promise<pulumi.dynamic.CreateResult> {
    const uuid = await import('uuid')
    const client = await createClient()

    let source:
      | Expr
      | {
          collection: Expr
          fields?: {
            [index: string]: Expr
          }
        }[]
    if (Array.isArray(inputs.source)) {
      source = inputs.source.map((element: SourceObject) => {
        return {
          collection: q.Collection(element.collection),
          fields: element.fields,
        }
      })
    } else {
      source = q.Collection(inputs.source)
    }

    async function tryCreateIndex(): Promise<IndexResponse> {
      return client.query(
        q.CreateIndex({
          name: inputs.name,
          source: source,
          terms: inputs.terms,
          values: inputs.values,
          unique: inputs.unique,
          serialized: inputs.serialized,
          data: inputs.data,
        })
      )
    }

    const response = await tryCreate(tryCreateIndex)

    return {
      id: uuid.v4(),
      outs: generateOutput(inputs, response),
    }
  }

  async diff(
    id: pulumi.ID,
    olds: IndexProviderArgs,
    news: IndexProviderArgs
  ): Promise<pulumi.dynamic.DiffResult> {
    const stables: string[] = []

    let update = false
    const updateKeys = ['name', 'unique', 'data'] as (keyof IndexProviderArgs)[]
    for (const key of updateKeys) {
      if (olds[key] == null && news[key] == null) {
        // Do nothing
      } else if (JSON.stringify(olds[key]) !== JSON.stringify(news[key])) {
        update = true
      } else {
        stables.push(key)
      }
    }

    // Special case for Serialized because it has defaults
    if (
      (news.serialized === false && olds.serialized !== false) ||
      (news.serialized !== false && olds.serialized === false)
    ) {
      update = true
    } else {
      stables.push('serialized')
    }

    const replaces: string[] = []
    const replaceKeys = [
      'source',
      'terms',
      'values',
    ] as (keyof IndexProviderArgs)[]
    for (const key of replaceKeys) {
      if (olds[key] == null && news[key] == null) {
        // Do nothing
      } else if (JSON.stringify(olds[key]) !== JSON.stringify(news[key])) {
        update = true
        replaces.push(key)
      } else {
        stables.push(key)
      }
    }

    return {
      changes: update,
      replaces,
      stables,
      deleteBeforeReplace: true,
    }
  }

  async update(
    id: pulumi.ID,
    olds: IndexProviderArgs,
    news: IndexProviderArgs
  ): Promise<pulumi.dynamic.UpdateResult> {
    const client = await createClient()

    let response: IndexResponse
    try {
      response = await client.query(
        q.Update(q.Index(olds.name), {
          name: news.name,
          unique: news.unique,
          serialized: news.serialized,
          data: news.data,
        })
      )
    } catch (error) {
      throw new Error(
        JSON.stringify(
          error.requestResult.responseContent.errors[0].description
        )
      )
    }

    const outs = generateOutput(news, response)
    return {
      outs: outs,
    }
  }

  async delete(id: pulumi.ID, props: IndexProviderArgs) {
    const client = await createClient()

    try {
      await client.query(q.Delete(q.Index(props.name)))
    } catch (error) {
      throw new Error(error.requestResult.responseContent.errors[0].description)
    }
  }
}

export interface IndexArgs {
  name?: pulumi.Input<string>
  source: pulumi.Input<string | SourceObject[]>
  terms?: pulumi.Input<(BindingValue | { field: string[] })[]>
  values?: pulumi.Input<
    (BindingValue | { field: string[]; reverse?: boolean })[]
  >
  unique?: pulumi.Input<boolean>
  serialized?: pulumi.Input<boolean>
  data?: pulumi.Input<Record<string, unknown>>
}

export class Index extends pulumi.dynamic.Resource {
  public readonly name?: pulumi.Output<string>
  public readonly ts?: pulumi.Output<number>
  public readonly serialized?: pulumi.Output<boolean>
  public readonly partitions?: pulumi.Output<number>

  // TODO: Figure out what the output of Source is
  // public readonly sourceCollectionName?: pulumi.Output<string>

  constructor(
    name: string,
    args: IndexArgs,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(new IndexResourceProvider(), name, { name, ...args }, opts)
  }
}
