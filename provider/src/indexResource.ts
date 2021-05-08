import * as pulumi from '@pulumi/pulumi'
import { Expr } from 'faunadb'
import { IndexResponse, q } from './fauna'
import {
  recursivelyConstructExpr,
  SerializedExpr,
} from './utils/serializedExpr'
import { tryQuery } from './utils/tryQuery'

interface SerializedSourceObject {
  collection: string | SerializedExpr
  fields?: {
    [index: string]: SerializedExpr
  }
}

interface BindingValue {
  binding: string
}

interface IndexProviderArgs {
  name: string
  source: string | SerializedExpr | SerializedSourceObject[]
  terms?: (BindingValue | { field: string[] })[]
  values?: (BindingValue | { field: string[]; reverse?: boolean })[]
  unique?: boolean
  serialized?: boolean
  data?: Record<string, unknown>
}

function generateOuts(
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

  const keys = [
    'terms',
    'values',
    'unique',
    'data',
  ] as (keyof IndexProviderArgs)[]
  const coercedOuts = outs as any

  for (const key of keys) {
    if (input[key] != null) {
      // Sigh, can't make this work with TS
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

    let source: Expr | SourceObject[]
    if (Array.isArray(inputs.source)) {
      source = inputs.source.map((element: SerializedSourceObject) => {
        const sourceObject: SourceObject = {
          collection:
            typeof element.collection === 'string'
              ? q.Collection(element.collection)
              : new Expr(element.collection.raw),
        }

        if (element.fields != null) {
          const fields: { [index: string]: Expr } = {}

          for (const [key, value] of Object.entries(element.fields)) {
            fields[key] = recursivelyConstructExpr(value)
          }

          sourceObject.fields = fields
        }

        return sourceObject
      })
    } else {
      source =
        typeof inputs.source === 'string'
          ? q.Collection(inputs.source)
          : new Expr(inputs.source.raw)
    }

    const response = await tryQuery<IndexResponse>(
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

    return {
      id: uuid.v4(),
      outs: generateOuts(inputs, response),
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
        // TODO: Handle ordering difference (not an update)
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
    const response = await tryQuery<IndexResponse>(
      q.Update(q.Index(olds.name), {
        name: news.name,
        unique: news.unique,
        serialized: news.serialized,
        data: news.data,
      })
    )

    return {
      outs: generateOuts(news, response),
    }
  }

  async delete(id: pulumi.ID, props: IndexProviderArgs) {
    await tryQuery(q.Delete(q.Index(props.name)))
  }
}

interface SourceObject {
  collection: pulumi.Input<string | Expr>
  fields?: {
    [index: string]: pulumi.Input<Expr>
  }
}

export interface IndexArgs {
  name?: pulumi.Input<string>
  source: pulumi.Input<string | Expr | SourceObject[]>
  terms?: pulumi.Input<(BindingValue | { field: string[] })[]>
  values?: pulumi.Input<
    (BindingValue | { field: string[]; reverse?: boolean })[]
  >
  unique?: pulumi.Input<boolean>
  serialized?: pulumi.Input<boolean>
  data?: pulumi.Input<Record<string, unknown>>
}

export class Index extends pulumi.dynamic.Resource {
  public readonly name!: pulumi.Output<string>
  public readonly ts!: pulumi.Output<number>
  public readonly serialized!: pulumi.Output<boolean>
  public readonly partitions!: pulumi.Output<number>

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
