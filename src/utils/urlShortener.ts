export async function shortenUrl(longUrl: string): Promise<string> {
  if (longUrl.length > 5000) {
    throw new Error('Conteúdo muito grande para gerar link curto — reduza o texto e tente novamente')
  }
  const res = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`)
  const json = await res.json() as { shorturl?: string; errormessage?: string }
  if (!json.shorturl) throw new Error(json.errormessage ?? 'Erro desconhecido')
  return json.shorturl
}

export function isLocalhost(): boolean {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}
