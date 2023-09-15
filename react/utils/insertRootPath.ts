export default function insertRootPath(
  rootPath: string | undefined,
  apiRoute: string
) {
  const pathWithRootPath = rootPath ? `${rootPath}${apiRoute}` : apiRoute

  return pathWithRootPath
}
