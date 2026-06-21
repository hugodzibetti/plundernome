export function extractHeaders(msg: SoupMessage): Record<string, string> {
  const headers: Record<string, string> = {}
  if (msg.response_headers) {
    msg.response_headers.foreach((name: string, value: string) => {
      headers[name] = value
    })
  }
  return headers
}
