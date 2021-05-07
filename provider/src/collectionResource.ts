import * as pulumi from '@pulumi/pulumi'
import { CollectionResponse, q } from './fauna'
import { tryQuery } from './utils/tryQuery'

interface CollectionProviderArgs {
  name: string
  history_days?: number | null
  ttl_days?: number | null
  data?: Record<string, unknown>
}

function generateOutput(response: CollectionResponse): CollectionResponse {
  const outs: CollectionResponse = { name: response.name, ts: response.ts }
  if (response.history_days != null) {
    outs.history_days = response.history_days
  }
  if (response.ttl_days != null) {
    outs.ttl_days = response.ttl_days
  }

  return outs
}

class CollectionResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(
    inputs: CollectionProviderArgs
  ): Promise<pulumi.dynamic.CreateResult> {
    const uuid = await import('uuid')

    const response = await tryQuery<CollectionResponse>(
      q.CreateCollection({
        name: inputs.name,
        history_days: inputs.history_days,
        ttl_days: inputs.ttl_days,
        data: inputs.data,
      })
    )

    return {
      id: uuid.v4(),
      outs: generateOutput(response),
    }
  }

  async diff(
    id: pulumi.ID,
    olds: CollectionProviderArgs,
    news: CollectionProviderArgs
  ): Promise<pulumi.dynamic.DiffResult> {
    let update = false
    const stables: string[] = []

    const keys = [
      'name',
      'history_days',
      'ttl_days',
      'data',
    ] as (keyof CollectionProviderArgs)[]

    for (const key of keys) {
      if (olds[key] == null && news[key] == null) {
        // Do nothing
      } else if (JSON.stringify(olds[key]) === JSON.stringify(news[key])) {
        stables.push(key)
      } else if (
        key === 'history_days' &&
        ((olds.history_days === 30 && news.history_days == null) ||
          (olds.history_days == null && news.history_days === 30))
      ) {
        // History Days is a special case, because the default is
        //  30 days. This value will be 30 even if input is undefined

        // TODO: In theory the output should always be 30 as it's always
        //   returned from the query. Pulumi is having a difficult time
        //   serializing and returning the proper output at the moment though.

        stables.push(key)
      } else {
        update = true
      }
    }

    return {
      changes: update,
      stables,
    }
  }

  async update(
    id: pulumi.ID,
    olds: CollectionProviderArgs,
    news: CollectionProviderArgs
  ): Promise<pulumi.dynamic.UpdateResult> {
    const response = await tryQuery<CollectionResponse>(
      q.Update(q.Collection(olds.name), {
        name: news.name,
        history_days: news.history_days,
        ttl_days: news.ttl_days,
        data: news.data,
      })
    )

    return {
      outs: generateOutput(response),
    }
  }

  async delete(id: pulumi.ID, props: CollectionProviderArgs) {
    await tryQuery(q.Delete(q.Collection(props.name)))
  }
}

export interface CollectionArgs {
  name?: pulumi.Input<string>
  history_days?: pulumi.Input<number | null>
  ttl_days?: pulumi.Input<number | null>
  data?: pulumi.Input<Record<string, unknown>>
}
export class Collection extends pulumi.dynamic.Resource {
  public readonly name!: pulumi.Output<string>
  public readonly ts!: pulumi.Output<number>
  public readonly history_days!: pulumi.Output<number | null>
  public readonly ttl_days!: pulumi.Output<number | null>

  constructor(
    name: string,
    args?: CollectionArgs,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(new CollectionResourceProvider(), name, { name, ...args }, opts)
  }
}
