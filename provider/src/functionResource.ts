import * as pulumi from '@pulumi/pulumi'
import { Expr } from 'faunadb'
import { FunctionResponse, q } from './fauna'
import { BuiltInRole } from './utils/builtInRoles'
import {
  recursivelyConstructExpr,
  SerializedExpr,
} from './utils/serializedExpr'
import { tryQuery } from './utils/tryQuery'

interface FunctionConfiguration {
  name: string
  body: Expr
  data?: Record<string, unknown>
  role?: BuiltInRole | Expr
}

interface FunctionProviderArgs {
  name: string
  body: SerializedExpr
  data?: Record<string, unknown>
  role?: BuiltInRole | SerializedExpr
  ts?: number
}

class FunctionResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(
    inputs: FunctionProviderArgs
  ): Promise<pulumi.dynamic.CreateResult> {
    const uuid = await import('uuid')

    const params: FunctionConfiguration = {
      name: inputs.name,
      body: recursivelyConstructExpr(inputs.body),
    }

    if (inputs.data != null) {
      params.data = inputs.data
    }

    if (inputs.role != null) {
      if (typeof inputs.role === 'string') {
        params.role = inputs.role
      } else {
        params.role = recursivelyConstructExpr(inputs.role)
      }
    }

    const result = await tryQuery<FunctionResponse>(q.CreateFunction(params))

    return {
      id: uuid.v4(),
      outs: generateOuts(result, inputs),
    }
  }

  async diff(
    id: pulumi.ID,
    olds: FunctionProviderArgs,
    news: FunctionProviderArgs
  ): Promise<pulumi.dynamic.DiffResult> {
    let changes = JSON.stringify(olds.body) !== JSON.stringify(news.body)

    changes = changes || olds.name !== news.name

    changes = changes || JSON.stringify(olds.role) !== JSON.stringify(news.role)

    changes = changes || JSON.stringify(olds.data) !== JSON.stringify(news.data)

    return {
      changes,
    }
  }

  async update(
    id: pulumi.ID,
    olds: FunctionProviderArgs,
    news: FunctionProviderArgs
  ): Promise<pulumi.dynamic.UpdateResult> {
    const result = await tryQuery<FunctionResponse>(
      q.Update(q.Function(olds.name), {
        name: news.name,
        body: news.body,
        data: news.data,
      })
    )

    return {
      outs: generateOuts(result, news),
    }
  }

  async delete(id: pulumi.ID, props: FunctionProviderArgs) {
    await tryQuery(q.Delete(q.Function(props.name)))
  }
}

function generateOuts(result: FunctionResponse, inputs: FunctionProviderArgs) {
  const outs: FunctionProviderArgs = {
    name: result.name,
    body: inputs.body,
    ts: result.ts,
  }

  if (inputs.role != null) {
    outs.role = inputs.role
  }
  return outs
}

export interface FunctionArgs {
  name?: pulumi.Input<string>
  body: pulumi.Input<Expr>
  data?: pulumi.Input<Record<string, unknown>>
  role?: pulumi.Input<BuiltInRole | Expr>
}
export class Function extends pulumi.dynamic.Resource {
  public readonly name!: pulumi.Output<string>
  public readonly ts!: pulumi.Output<number>

  constructor(
    name: string,
    args: FunctionArgs,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(new FunctionResourceProvider(), name, { name, ...args }, opts)
  }
}
