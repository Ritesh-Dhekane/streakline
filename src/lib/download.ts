// Turns an SVG card into a PNG download in the browser (the Worker can't rasterise on the free
// plan). The card embeds its avatar, so the canvas isn't tainted.
export async function downloadSvgAsPng(svgUrl: string, fileName: string, scale = 2) {
  const response = await fetch(svgUrl)
  if (!response.ok) throw new Error(`Card request failed (${response.status})`)
  const svg = await response.text()
  const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = blobUrl
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth * scale
    canvas.height = image.naturalHeight * scale
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('PNG failed'))),
        'image/png',
      ),
    )
    const link = document.createElement('a')
    link.href = URL.createObjectURL(png)
    link.download = fileName
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}
