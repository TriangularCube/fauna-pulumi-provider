import * as pulumi from '@pulumi/pulumi'
import { Expr } from 'faunadb'
import { q, TokenResponse } from './fauna'
import {
  recursivelyConstructExpr,
  SerializedExpr,
} from './utils/serializedExpr'
import { tryQuery } from './utils/tryQuery'

interface TokenProviderArgs {
  instance: SerializedExpr
}
class TokenResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(
    inputs: TokenProviderArgs
  ): Promise<pulumi.dynamic.CreateResult> {
    const response = await tryQuery<TokenResponse>(
      q.Create(q.Tokens(), {
        instance: recursivelyConstructExpr(inputs.instance),
      })
    )

    return {
      id: response.ref.id,
      outs: {
        instance: inputs.instance,
        ts: response.ts,
        secret: response.secret,
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
    await tryQuery(q.Delete(q.Ref(q.Tokens(), id)))
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
