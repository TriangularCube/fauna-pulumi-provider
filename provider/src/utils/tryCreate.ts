import util from 'util'

export async function tryCreate<T>(func: () => Promise<T>): Promise<T> {
  let response: T
  let retry = false

  try {
    response = await func()
  } catch (error) {
    const errorData = error.requestResult.responseContent.errors[0]

    // TODO: Match other errors which warrant retry
    // TODO: Support multiple errors?
    if (errorData.failures?.[0].code === 'duplicate value') {
      retry = true
    } else {
      console.error(
        util.inspect(error.requestResult.responseContent.errors[0], {
          depth: null,
        })
      )
      throw new Error(errorData.description)
    }
  }

  if (retry) {
    try {
      await new Promise(resolve => setTimeout(resolve, 60000))

      response = await func()
    } catch (error) {
      console.error(error.requestResult.responseContent.errors[0])
      throw new Error(error.requestResult.responseContent.errors[0].description)
    }
  }

  return response!
}
