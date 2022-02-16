export const patchSession = async (isCombined: string, rootPath?: string) => {
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

  await fetch(`${rootPath ?? ''}/api/sessions`, options)

  return 'success'
}

export const getSession = async (rootPath?: string) => {
  const res = await (
    await fetch(`${rootPath ?? ''}/api/sessions?items=public.isCombined`)
  ).json()

  return res.namespaces.public.isCombined.value
}
