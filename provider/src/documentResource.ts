import * as pulumi from '@pulumi/pulumi'
import { createClient, q, DocumentResponse } from './fauna'
import { tryCreate } from './utils/tryCreate'

interface DocumentProviderArgs {
  collection: string
  data: Record<string, unknown>
}
class DocumentResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(
    inputs: DocumentProviderArgs
  ): Promise<pulumi.dynamic.CreateResult> {
    const client = await createClient()
    const uuid = await import('uuid')

    const tryCreateDocument = async (): Promise<DocumentResponse> => {
      return await client.query(
        q.Create(q.Collection(inputs.collection), {
          data: inputs.data,
        })
      )
    }

    const result = await tryCreate(tryCreateDocument)

    return {
      id: uuid.v4(),
      outs: {
        collection: inputs.collection,
        id: result.ref.id,
        data: inputs.data,
        ts: result.ts,
      },
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

    console.log(replaces)

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
    const client = await createClient()

    let response: DocumentResponse
    try {
      response = await client.query(
        q.Update(q.Ref(q.Collection(news.collection), id), {
          data: news.data,
        })
      )
    } catch (error) {
      throw new Error(
        JSON.stringify(error.requestResult.responseContent.errors[0])
      )
    }

    return {
      outs: {
        collection: news.collection,
        data: news.data,
        ts: response.ts,
      },
    }
  }

  async delete(id: pulumi.ID, props: DocumentProviderArgs) {
    const client = await createClient()

    try {
      await client.query(q.Delete(q.Ref(q.Collection(props.collection), id)))
    } catch (error) {
      console.error(error.requestResult.responseContent.errors)
      throw new Error(error.requestResult.responseContent.errors[0].description)
    }
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
