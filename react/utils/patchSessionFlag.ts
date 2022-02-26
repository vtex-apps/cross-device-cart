export const patchSessionFlag = async (isCombined: string) => {
  const myHeaders = new Headers()

  myHeaders.append('Content-Type', 'application/json')

  const sessionBody = JSON.stringify({
    public: {
      isCombined: {
        value: isCombined,
      },
    },
  })

  const options = {
    method: 'POST',
    headers: myHeaders,
    body: sessionBody,
  }

  await fetch(`/api/sessions`, options)

  return true
}

export const getSessionFlag = async () => {
  const session = await (
    await fetch(`/api/sessions?items=public.isCombined`)
  ).json()

  return session?.namespaces?.public?.isCombined.value ?? 'false'
}
