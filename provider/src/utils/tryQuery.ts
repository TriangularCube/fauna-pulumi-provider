import { Client, Expr } from 'faunadb'
import util from 'util'
import { createClient } from '../fauna'

let client: Client

interface FaunaError {
  requestResult: {
    responseContent: {
      errors: {
        description: string
        failures?: {
          code: string
        }[]
      }[]
    }
  }
}

export async function tryQuery<T>(query: Expr): Promise<T> {
  let response: T
  let retry = false

  if (client == null) {
    client = await createClient()
  }

  try {
    response = await client.query(query)
  } catch (error) {
    const faunaError = error as FaunaError
    const errorData = faunaError.requestResult.responseContent.errors[0]

    // TODO: Match other errors which warrant retry
    // TODO: Support multiple errors?
    if (errorData.failures?.[0].code === 'duplicate value') {
      retry = true
    } else {
      console.error(
        util.inspect(errorData, {
          depth: null,
        })
      )
      throw new Error(errorData.description)
    }
  }

  if (retry) {
    try {
      // Wait 60 seconds for duplicate entries to finish resolving in Fauna
      await new Promise(resolve => setTimeout(resolve, 60000))

      response = await client.query(query)
    } catch (error) {
      const faunaError = error as FaunaError
      console.error(
        util.inspect(faunaError.requestResult.responseContent.errors[0], {
          depth: null,
        })
      )
      throw new Error(
        faunaError.requestResult.responseContent.errors[0].description
      )
    }
  }

  return response!
}
