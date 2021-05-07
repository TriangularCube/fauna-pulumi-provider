import * as pulumi from '@pulumi/pulumi'
import { Expr } from 'faunadb'
import { createClient, FunctionResponse, q } from './fauna'
import { BuiltInRole } from './utils/builtInRoles'
import {
  recursivelyConstructExpr,
  SerializedExpr,
} from './utils/serializedExpr'
import { tryCreate } from './utils/tryCreate'

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

    const outs: FunctionProviderArgs = {
      name: result.name,
      body: inputs.body,
      ts: result.ts,
    }

    if (inputs.role != null) {
      outs.role = inputs.role
    }

    return {
      id: uuid.v4(),
      outs: outs,
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
    const client = await createClient()

    let response: FunctionResponse
    try {
      response = await client.query(
        q.Update(q.Function(olds.name), {
          name: news.name,
          body: news.body,
          data: news.data,
        })
      )
    } catch (error) {
      console.error(error.requestResult.responseContent.errors[0])
      throw new Error(
        JSON.stringify(
          error.requestResult.responseContent.errors[0].description
        )
      )
    }

    return {
      outs: {
        name: response.name,
        ts: response.ts,
        body: news.body,
        data: news.data,
      },
    }
  }

  async delete(id: pulumi.ID, props: FunctionProviderArgs) {
    const client = await createClient()

    try {
      await client.query(q.Delete(q.Function(props.name)))
    } catch (error) {
      console.error(error.requestResult.responseContent.errors)
      throw new Error(error.requestResult.responseContent.errors[0].description)
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
