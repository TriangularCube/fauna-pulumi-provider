import { Client, values } from 'faunadb'
import Ref = values.Ref

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
}

export interface FunctionResponse {
  name: string
  ts: number
}

export interface TokenResponse {
  ref: Ref
  ts: number
  secret: string
}

export interface DocumentResponse {
  ref: Ref
  ts: number
}
