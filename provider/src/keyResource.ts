import * as pulumi from '@pulumi/pulumi'
import { Expr } from 'faunadb'
import { KeyResponse, q } from './fauna'
import { BuiltInRole } from './utils/builtInRoles'
import { SerializedExpr } from './utils/serializedExpr'
import { tryQuery } from './utils/tryQuery'

interface KeyProviderArgs {
  role: BuiltInRole | SerializedExpr | SerializedExpr[]
  data: {
    name: string
    [index: string]: unknown
  }
}

class KeyResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(inputs: KeyProviderArgs): Promise<pulumi.dynamic.CreateResult> {
    let role: string | Expr | Expr[]
    if (Array.isArray(inputs.role)) {
      role = inputs.role.map(element => new Expr(element.raw))
    } else if (typeof inputs.role === 'string') {
      role = inputs.role
    } else {
      role = new Expr(inputs.role.raw)
    }

    const response = await tryQuery<KeyResponse>(
      q.CreateKey({
        role,
        data: inputs.data,
      })
    )

    return {
      id: response.ref.id,
      outs: generateOuts(response, inputs),
    }
  }

  async delete(id: pulumi.ID) {
    await tryQuery(q.Delete(q.Ref(q.Keys(), id)))
  }
}

function generateOuts(response: KeyResponse, inputs: KeyProviderArgs) {
  return {
    ts: response.ts,
    role: inputs.role,
    data: inputs.data,
    secret: response.secret,
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
