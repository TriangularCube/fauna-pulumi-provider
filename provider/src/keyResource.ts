import * as pulumi from '@pulumi/pulumi'
import { Expr } from 'faunadb'
import { createClient, q, KeyResponse } from './fauna'
import { BuiltInRole } from './utils/builtInRoles'
import { SerializedExpr } from './utils/serializedExpr'
import { tryCreate } from './utils/tryCreate'

interface KeyProviderArgs {
  role: BuiltInRole | SerializedExpr | SerializedExpr[]
  data: {
    name: string
    [index: string]: unknown
  }
}
class KeyResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(inputs: KeyProviderArgs): Promise<pulumi.dynamic.CreateResult> {
    const client = await createClient()

    let role: string | Expr | Expr[]
    if (Array.isArray(inputs.role)) {
      role = inputs.role.map(element => new Expr(element.raw))
    } else if (typeof inputs.role === 'string') {
      role = inputs.role
    } else {
      role = new Expr(inputs.role.raw)
    }

    const tryCreateKey = async (): Promise<KeyResponse> => {
      return await client.query(
        q.CreateKey({
          role,
          data: inputs.data,
        })
      )
    }

    const result = await tryCreate(tryCreateKey)

    return {
      id: result.ref.id,
      outs: {
        ts: result.ts,
        role: inputs.role,
        data: inputs.data,
        secret: result.secret,
      },
    }
  }

  async delete(id: pulumi.ID) {
    const client = await createClient()

    try {
      await client.query(q.Delete(q.Ref(q.Keys(), id)))
    } catch (error) {
      console.error(error.requestResult.responseContent.errors)
      throw new Error(error.requestResult.responseContent.errors[0].description)
    }
  }
}

interface KeyArgs {
  role: BuiltInRole | Expr | Expr[]
  data?: {
    name?: string
    [index: string]: unknown
  }
}
export class Key extends pulumi.dynamic.Resource {
  public readonly ts!: pulumi.Output<number>
  public readonly secret!: pulumi.Output<string>

  constructor(
    name: string,
    args: KeyArgs,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(
      new KeyResourceProvider(),
      name,
      {
        ...args,
        data: {
          name: name,
          ...args.data,
        },
      },
      opts
    )
  }
}
