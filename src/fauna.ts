import { Client } from 'faunadb'

export { query as q } from 'faunadb'

export const createClient = async (): Promise<Client> => {
  const pulumi = await import('@pulumi/pulumi')
  const config = new pulumi.Config()

  const key = process.env.FAUNA_KEY ?? config.require('faunaKey')
  const faunadb = await import('faunadb')

  return new faunadb.Client({ secret: key })
}
