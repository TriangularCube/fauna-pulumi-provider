import * as pulumi from '@pulumi/pulumi'
import { Expr } from 'faunadb'

import { createClient, q, RoleResponse } from './fauna'
import {
  recursivelyConstructExpr,
  SerializedExpr,
} from './utils/serializedExpr'
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
interface PrivilegeConfiguration {
  resource: Expr
  actions: Actions
}
interface MembershipConfiguration {
  resource: Expr
  predicate?: Expr
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

interface SerializedPrivilegeConfiguration {
  resource: SerializedExpr
  actions: SerializedActions
}

interface SerializedMembershipConfiguration {
  resource: SerializedExpr
  predicate?: SerializedExpr
}

interface RoleConfiguration {
  name: string
  privileges: PrivilegeConfiguration[]
  membership?: MembershipConfiguration[]
}

interface RoleProviderArgs {
  name: string
  privileges: SerializedPrivilegeConfiguration[]
  membership?: SerializedMembershipConfiguration[]
}
class RoleResourceProvider implements pulumi.dynamic.ResourceProvider {
  async create(inputs: RoleProviderArgs): Promise<pulumi.dynamic.CreateResult> {
    const uuid = await import('uuid')
    const client = await createClient()

    const tryCreateRole = async (): Promise<RoleResponse> => {
      const params = constructRoleConfig(inputs)

      return await client.query(q.CreateRole(params))
    }

    const result = await tryCreate<RoleResponse>(tryCreateRole)
    const outs = generateOutput(inputs, result)

    return {
      id: uuid.v4(),
      outs,
    }
  }

  async diff(
    id: pulumi.ID,
    olds: RoleProviderArgs,
    news: RoleProviderArgs
  ): Promise<pulumi.dynamic.DiffResult> {
    let update = false

    update = update || comparePrivileges(olds.privileges, news.privileges)
    update = update || comparePrivileges(news.privileges, olds.privileges)

    update = update || compareMembership(olds.membership, news.membership)
    update = update || compareMembership(news.membership, olds.membership)

    return {
      changes: update,
    }
  }

  async update(
    id: pulumi.ID,
    olds: RoleProviderArgs,
    news: RoleProviderArgs
  ): Promise<pulumi.dynamic.UpdateResult> {
    const client = await createClient()

    const params = constructRoleConfig(news)

    let response: RoleResponse
    try {
      response = await client.query(q.Update(q.Role(olds.name), params))
    } catch (error) {
      console.error(error.requestResult.responseContent.errors[0])
      throw new Error(
        JSON.stringify(
          error.requestResult.responseContent.errors[0].description
        )
      )
    }

    return {
      outs: generateOutput(news, response),
    }
  }

  async delete(id: pulumi.ID, props: RoleProviderArgs) {
    const client = await createClient()

    try {
      await client.query(q.Delete(q.Role(props.name)))
    } catch (error) {
      console.error(error.requestResult.responseContent.errors)
      throw new Error(error.requestResult.responseContent.errors[0].description)
    }
  }
}

function constructRoleConfig(input: RoleProviderArgs): RoleConfiguration {
  const privileges = input.privileges.map(element => {
    const actions: Actions = {}
    for (const [stringKey, value] of Object.entries(element.actions)) {
      const key = stringKey as keyof Actions
      if (typeof value == 'boolean') {
        actions[key] = value
      } else {
        actions[key] = recursivelyConstructExpr(value)
      }
    }

    return {
      resource: recursivelyConstructExpr(element.resource),
      actions,
    }
  })

  const params: RoleConfiguration = {
    name: input.name,
    privileges: privileges,
  }

  if (input.membership != null) {
    params.membership = input.membership.map(element => {
      const membership: MembershipConfiguration = {
        resource: recursivelyConstructExpr(element.resource),
      }

      if (element.predicate != null) {
        membership.predicate = recursivelyConstructExpr(element.predicate)
      }

      return membership
    })
  }

  return params
}

const keys = [
  'create',
  'delete',
  'read',
  'write',
  'history_read',
  'history_write',
  'unrestricted_read',
  'call',
]

function comparePrivileges(
  from: SerializedPrivilegeConfiguration[],
  to: SerializedPrivilegeConfiguration[]
): boolean {
  if (from == null && to == null) {
    return false
  }

  if (from == null || to == null) {
    return true
  }

  if (from.length != to.length) {
    return true
  }

  for (const privilege of from) {
    const privString = JSON.stringify(privilege.resource.raw)
    const foundPrivileges = to.filter(
      value => JSON.stringify(value.resource.raw) === privString
    )

    const actions = privilege.actions
    for (const stringKey of keys) {
      const key = stringKey as keyof SerializedActions
      if (actions[key] == null) {
        continue
      }

      if (
        !foundPrivileges.some(
          foundPrivilege =>
            JSON.stringify(foundPrivilege.actions[key]) ===
            JSON.stringify(actions[key])
        )
      ) {
        return true
      }
    }
  }

  return false
}

function compareMembership(
  from?: SerializedMembershipConfiguration[],
  to?: SerializedMembershipConfiguration[]
): boolean {
  if (from == null && to == null) {
    return false
  }

  if (from == null || to == null) {
    return true
  }

  if (from.length != to.length) {
    return true
  }

  for (const membership of from) {
    const foundMemberships = to.filter(
      value =>
        JSON.stringify(value.resource.raw) ===
        JSON.stringify(membership.resource.raw)
    )

    if (membership.predicate == null) {
      if (foundMemberships.length < 1) {
        return true
      }
    } else {
      const predicate = JSON.stringify(membership.predicate.raw)

      if (
        !foundMemberships.some(
          element => JSON.stringify(element.predicate?.raw) === predicate
        )
      ) {
        return true
      }
    }
  }

  return false
}

function generateOutput(input: RoleProviderArgs, response: RoleResponse) {
  return {
    name: response.name,
    ts: response.ts,
    privileges: input.privileges,
    membership: input.membership ?? null,
  }
}

export interface RoleArgs {
  name?: pulumi.Input<string>
  privileges: pulumi.Input<PrivilegeConfiguration[]>
  membership?: pulumi.Input<MembershipConfiguration[]>
}
export class Role extends pulumi.dynamic.Resource {
  public readonly name!: pulumi.Output<string>
  public readonly ts!: pulumi.Output<number>
  public readonly privileges!: pulumi.Output<PrivilegeConfiguration[]>
  public readonly membership!: pulumi.Output<MembershipConfiguration[]>

  constructor(
    name: string,
    args: RoleArgs,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(new RoleResourceProvider(), name, { name, ...args }, opts)
  }
}
