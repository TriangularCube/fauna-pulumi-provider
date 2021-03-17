import * as pulumi from '@pulumi/pulumi'
import uuid from 'uuid'
import { createClient, q } from './fauna'

interface CollectionProviderArgs {
  name: string
}

class CollectionResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(
    inputs: CollectionProviderArgs
  ): Promise<pulumi.dynamic.CreateResult> {
    const client = await createClient()

    const response: { name: string } = await client.query(
      q.CreateCollection({ name: inputs.name })
    )

    return {
      id: uuid.v4(),
      outs: { collectionName: response.name },
    }
  }
}

export interface CollectionArgs {
  name: pulumi.Input<string>
}
export class Collection extends pulumi.dynamic.Resource {
  public readonly collectionName?: pulumi.Output<string>

  constructor(
    name: string,
    args?: CollectionArgs,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(new CollectionResourceProvider(), name, { name, ...args }, opts)
  }
}
