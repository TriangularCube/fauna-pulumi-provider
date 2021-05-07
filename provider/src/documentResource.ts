import * as pulumi from '@pulumi/pulumi'
import { DocumentResponse, q } from './fauna'
import { constructObjWithExpr } from './utils/serializedExpr'
import { tryQuery } from './utils/tryQuery'

interface DocumentParams {
  data?: Record<string, unknown>
  credentials?: Record<string, unknown>
  ttl?: string | number
}

interface DocumentProviderArgs {
  collection: string
  params?: DocumentParams
}
class DocumentResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(
    inputs: DocumentProviderArgs
  ): Promise<pulumi.dynamic.CreateResult> {
    const response = await tryQuery<DocumentResponse>(
      q.Create(q.Collection(inputs.collection), constructParams(inputs.params))
    )

    return {
      id: response.ref.id,
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

    changes =
      changes || JSON.stringify(olds.params) !== JSON.stringify(news.params)

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
      q.Update(
        q.Ref(q.Collection(news.collection), id),
        constructParams(news.params)
      )
    )

    return {
      outs: generateOuts(response, news),
    }
  }

  async delete(id: pulumi.ID, props: DocumentProviderArgs) {
    await tryQuery(q.Delete(q.Ref(q.Collection(props.collection), id)))
  }
}

function constructParams(params?: DocumentParams): DocumentParams {
  const out: DocumentParams = {}

  if (params?.data != null) {
    out.data = constructObjWithExpr(params.data)
  }

  if (params?.credentials != null) {
    out.credentials = constructObjWithExpr(params.credentials)
  }

  if (params?.ttl != null) {
    out.ttl = params.ttl
  }

  return out
}

function generateOuts(
  response: DocumentResponse,
  inputs: DocumentProviderArgs
) {
  return {
    collection: inputs.collection,
    id: response.ref.id,
    params: inputs.params,
    ts: response.ts,
  }
}

interface DocumentArgs {
  collection: pulumi.Input<string>
  params?: {
    data?: pulumi.Input<Record<string, unknown>>
    credentials?: pulumi.Input<Record<string, unknown>>
    ttl?: pulumi.Input<string | number>
  }
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
