export async function tryCreate<T>(func: () => Promise<T>): Promise<T> {
  let response: T
  let retry = false

  try {
    response = await func()
  } catch (error) {
    const errorData = error.requestResult.responseContent.errors[0]

    if (errorData.failures?.[0].code === 'duplicate value') {
      retry = true
    } else {
      throw new Error(errorData.description)
    }
  }

  if (retry) {
    try {
      await new Promise(resolve => setTimeout(resolve, 60000))

      response = await func()
    } catch (error) {
      throw new Error(error.requestResult.responseContent.errors[0].description)
    }
  }

  return response!
}
