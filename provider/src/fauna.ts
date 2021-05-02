import { Client } from 'faunadb'

export const createClient = async (): Promise<Client> => {
  const key = process.env.FAUNA_ADMIN_KEY
  const faunadb = await import('faunadb')

  return new faunadb.Client({ secret: key ?? '' })
}
export { query as q } from 'faunadb'

export interface CollectionResponse {
  name: string
  ts: number
  history_days?: number | null
  ttl_days?: number | null
}

export interface IndexResponse {
  name: string
  ts: number
  serialized: boolean
  partitions: number

  // TODO: Figure out what comes back from Source
  // source: Expr
}

export interface RoleResponse {
  name: string
  ts: number
  privileges: Record<string, unknown>[]
  membership?: Record<string, unknown>[]
}
