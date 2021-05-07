import * as pulumi from '@pulumi/pulumi'
import { DocumentResponse, q } from './fauna'
import { tryQuery } from './utils/tryQuery'

interface DocumentProviderArgs {
  collection: string
  data: Record<string, unknown>
}
class DocumentResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(
    inputs: DocumentProviderArgs
  ): Promise<pulumi.dynamic.CreateResult> {
    const uuid = await import('uuid')

    const response = await tryQuery<DocumentResponse>(
      q.Create(q.Collection(inputs.collection), {
        data: inputs.data,
      })
    )

    return {
      id: uuid.v4(),
      outs: generateOuts(response, inputs),
    }
  }

  async diff(
    id: pulumi.ID,
    olds: DocumentProviderArgs,
    news: DocumentProviderArgs
  ): Promise<pulumi.dynamic.DiffResult> {
    let changes = false
    const replaces = []

    if (olds.collection !== news.collection) {
      console.log(olds.collection, news.collection)
      changes = true
      replaces.push('collection')
    }

    changes = changes || JSON.stringify(olds.data) !== JSON.stringify(news.data)

    return {
      changes,
      replaces,
      deleteBeforeReplace: true,
    }
  }

  async update(
    id: pulumi.ID,
    olds: DocumentProviderArgs,
    news: DocumentProviderArgs
  ): Promise<pulumi.dynamic.UpdateResult> {
    const response = await tryQuery<DocumentResponse>(
      q.Update(q.Ref(q.Collection(news.collection), id), {
        data: news.data,
      })
    )

    return {
      outs: generateOuts(response, news),
    }
  }

  async delete(id: pulumi.ID, props: DocumentProviderArgs) {
    await tryQuery(q.Delete(q.Ref(q.Collection(props.collection), id)))
  }
}

function generateOuts(
  response: DocumentResponse,
  inputs: DocumentProviderArgs
) {
  return {
    collection: inputs.collection,
    id: response.ref.id,
    data: inputs.data,
    ts: response.ts,
  }
}

interface DocumentArgs {
  collection: pulumi.Input<string>
  data: pulumi.Input<Record<string, unknown>>
}
export class Document extends pulumi.dynamic.Resource {
  public readonly ts!: pulumi.Output<number>

  constructor(
    name: string,
    args: DocumentArgs,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(new DocumentResourceProvider(), name, args, opts)
  }
}
