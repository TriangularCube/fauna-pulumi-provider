import * as pulumi from '@pulumi/pulumi'
import { Expr } from 'faunadb'
import { createClient, q, RoleResponse } from './fauna'
import { tryCreate } from './utils/tryCreate'

interface Actions {
  create?: boolean | Expr
  delete?: boolean | Expr
  read?: boolean | Expr
  write?: boolean | Expr
  history_read?: boolean | Expr
  history_write?: boolean | Expr
  unrestricted_read?: boolean | Expr
  call?: boolean | Expr
}

interface PrivilegeConfigurationExpr {
  resource: Expr
  actions: Actions
}

interface DeserializedRoleArgs {
  name: string
  privileges: PrivilegeConfigurationExpr[]
  // membership?:
}

interface SerializedExpr {
  raw: any
}

interface SerializedActions {
  create?: boolean | SerializedExpr
  delete?: boolean | SerializedExpr
  read?: boolean | SerializedExpr
  write?: boolean | SerializedExpr
  history_read?: boolean | SerializedExpr
  history_write?: boolean | SerializedExpr
  unrestricted_read?: boolean | SerializedExpr
  call?: boolean | SerializedExpr
}

interface PrivilegeConfiguration {
  resource: SerializedExpr
  actions: SerializedActions
}

interface MembershipConfiguration {
  resource: SerializedExpr
  predicate?: SerializedExpr
}

interface RoleProviderArgs {
  name: string
  privileges: PrivilegeConfiguration[]
  membership?: MembershipConfiguration[]
}
class RoleResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(inputs: RoleProviderArgs): Promise<pulumi.dynamic.CreateResult> {
    const uuid = await import('uuid')
    const client = await createClient()

    const tryCreateRole = async (): Promise<RoleResponse> => {
      const privileges: PrivilegeConfigurationExpr[] = inputs.privileges.map(
        element => {
          const actions: Actions = {}

          for (const [key, value] of Object.entries(element.actions)) {
            if (value != null) {
              actions[key as keyof Actions] = new Expr(value.raw)
            }
          }

          return {
            resource: new Expr(element.resource.raw),
            actions: actions,
          }
        }
      )

      const roleConfig: DeserializedRoleArgs = {
        name: inputs.name,
        privileges,
      }
      // if (inputs.membership != null) {
      //   roleConfig.membership = inputs.membership
      // }

      return await client.query(q.CreateRole(roleConfig))
    }

    const result = await tryCreate<RoleResponse>(tryCreateRole)

    return {
      id: uuid.v4(),
      outs: {
        name: result.name,
        ts: result.ts,
        privileges: inputs.privileges,
        membership: inputs.membership ?? null,
      },
    }
  }
}

export interface RoleArgs {
  name?: pulumi.Input<string>
  privileges: pulumi.Input<PrivilegeConfiguration[]>
  membership?: pulumi.Input<MembershipConfiguration[]>
}
export class Role extends pulumi.dynamic.Resource {
  public readonly name?: pulumi.Output<string>
  public readonly ts?: pulumi.Output<number>
  public readonly privileges?: pulumi.Output<PrivilegeConfiguration[]>
  public readonly membership?: pulumi.Output<MembershipConfiguration[]>

  constructor(name: string, args: RoleArgs) {
    super(new RoleResourceProvider(), name, { name, ...args }, {})
  }
}
