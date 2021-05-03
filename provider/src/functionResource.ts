import * as pulumi from '@pulumi/pulumi'
import { Expr } from 'faunadb'
import { createClient, FunctionResponse, q } from './fauna'
import {
  recursivelyConstructExpr,
  SerializedExpr,
} from './utils/serializedExpr'
import { tryCreate } from './utils/tryCreate'

type BuiltInRole = 'admin' | 'server' | 'server-readonly'

interface FunctionConfiguration {
  name: string
  body: Expr
  data?: Record<string, unknown>
  role?: BuiltInRole | Expr
}

interface SerializedFunctionArgs {
  name: string
  body: SerializedExpr
  data?: Record<string, unknown>
  role?: BuiltInRole | SerializedExpr
}

class FunctionResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(
    inputs: SerializedFunctionArgs
  ): Promise<pulumi.dynamic.CreateResult> {
    const client = await createClient()

    const tryCreateFunction = async (): Promise<FunctionResponse> => {
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

      return await client.query(q.CreateFunction(params))
    }

    const result = await tryCreate<FunctionResponse>(tryCreateFunction)

    return {
      id: result.name,
      outs: {
        name: result.name,
        ts: result.ts,
      },
    }
  }
}

export interface FunctionArgs {
  name?: pulumi.Input<string>
  body: pulumi.Input<Expr>
  data?: pulumi.Input<Record<string, unknown>>
  role?: pulumi.Input<BuiltInRole | Expr>
}
export class Function extends pulumi.dynamic.Resource {
  public readonly name?: pulumi.Output<string>
  public readonly ts?: pulumi.Output<number>

  constructor(
    name: string,
    args: FunctionArgs,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(new FunctionResourceProvider(), name, { name, ...args }, opts)
  }
}
