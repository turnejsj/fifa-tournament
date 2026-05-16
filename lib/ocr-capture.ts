/** Crop the scoreboard region from a live video frame (matches on-screen green box). */
export function captureCropRegionFromVideo(
  video: HTMLVideoElement,
  containerEl: HTMLElement,
  cropBoxEl: HTMLElement,
): HTMLCanvasElement | null {
  const videoWidth = video.videoWidth
  const videoHeight = video.videoHeight
  if (!videoWidth || !videoHeight) return null

  const container = containerEl.getBoundingClientRect()
  const crop = cropBoxEl.getBoundingClientRect()

  const scale = Math.max(container.width / videoWidth, container.height / videoHeight)
  const displayedWidth = videoWidth * scale
  const displayedHeight = videoHeight * scale
  const offsetX = (displayedWidth - container.width) / 2
  const offsetY = (displayedHeight - container.height) / 2

  const cropLeft = crop.left - container.left
  const cropTop = crop.top - container.top

  let sx = (cropLeft + offsetX) / scale
  let sy = (cropTop + offsetY) / scale
  let sw = crop.width / scale
  let sh = crop.height / scale

  sx = Math.max(0, Math.floor(sx))
  sy = Math.max(0, Math.floor(sy))
  sw = Math.max(1, Math.min(videoWidth - sx, Math.floor(sw)))
  sh = Math.max(1, Math.min(videoHeight - sy, Math.floor(sh)))

  const canvas = document.createElement("canvas")
  canvas.width = sw
  canvas.height = sh
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)
  return canvas
}

/** Grayscale + high contrast for sharper Tesseract reads on TV footage. */
export function applyHighContrastGrayscale(source: HTMLCanvasElement): HTMLCanvasElement {
  const output = document.createElement("canvas")
  output.width = source.width
  output.height = source.height
  const ctx = output.getContext("2d")
  if (!ctx) return source

  ctx.drawImage(source, 0, 0)
  const imageData = ctx.getImageData(0, 0, output.width, output.height)
  const { data } = imageData
  const contrast = 2.2

  for (let i = 0; i < data.length; i += 4) {
    const gray =
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const normalized = gray / 255 - 0.5
    const boosted = (normalized * contrast + 0.5) * 255
    const clamped = Math.max(0, Math.min(255, boosted))
    const binary = clamped > 140 ? 255 : 0
    data[i] = binary
    data[i + 1] = binary
    data[i + 2] = binary
  }

  ctx.putImageData(imageData, 0, 0)
  return output
}

export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png")
}
