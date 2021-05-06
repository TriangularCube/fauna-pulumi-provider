import * as pulumi from '@pulumi/pulumi'
import { Expr } from 'faunadb'
import { createClient, q, TokenResponse } from './fauna'
import {
  recursivelyConstructExpr,
  SerializedExpr,
} from './utils/serializedExpr'
import { tryCreate } from './utils/tryCreate'

interface TokenProviderArgs {
  instance: SerializedExpr
}
class TokenResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(
    inputs: TokenProviderArgs
  ): Promise<pulumi.dynamic.CreateResult> {
    const client = await createClient()

    const tryCreateToken = async (): Promise<TokenResponse> => {
      return await client.query(
        q.Create(q.Tokens(), {
          instance: recursivelyConstructExpr(inputs.instance),
        })
      )
    }

    const result = await tryCreate(tryCreateToken)

    return {
      id: result.ref.id,
      outs: {
        instance: inputs.instance,
        ts: result.ts,
        secret: result.secret,
      },
    }
  }

  async diff(
    id: pulumi.ID,
    olds: TokenProviderArgs,
    news: TokenProviderArgs
  ): Promise<pulumi.dynamic.DiffResult> {
    const replaces = []
    if (JSON.stringify(olds.instance) !== JSON.stringify(news.instance)) {
      replaces.push('instance')
    }
    return {
      changes: replaces.length > 0,
      replaces,
    }
  }

  async delete(id: pulumi.ID) {
    const client = await createClient()

    try {
      await client.query(q.Delete(q.Ref(q.Tokens(), id)))
    } catch (error) {
      console.error(error.requestResult.responseContent.errors)
      throw new Error(error.requestResult.responseContent.errors[0].description)
    }
  }
}

interface TokenArgs {
  instance: pulumi.Input<Expr>
}
export class Token extends pulumi.dynamic.Resource {
  public readonly ts!: pulumi.Output<number>
  public readonly secret!: pulumi.Output<string>

  constructor(
    name: string,
    args: TokenArgs,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(new TokenResourceProvider(), name, args, opts)
  }
}
