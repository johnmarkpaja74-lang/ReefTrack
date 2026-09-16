import QRCode from "qrcode"
import jsQR from "jsqr"

const baseOptions = {
  errorCorrectionLevel: "M",
  margin: 2,
  color: {
    dark: "#173d34",
    light: "#ffffff",
  },
}

globalThis.ReefTrackQRCode = Object.freeze({
  toCanvas(canvas, value, options = {}) {
    return QRCode.toCanvas(canvas, value, { ...baseOptions, ...options })
  },
  toDataURL(value, options = {}) {
    return QRCode.toDataURL(value, { ...baseOptions, ...options })
  },
})

const scannerCanvas = document.createElement("canvas")
const scannerContext = scannerCanvas.getContext("2d", { willReadFrequently: true })

function decodeSource(source, sourceWidth, sourceHeight) {
  if (!scannerContext || !sourceWidth || !sourceHeight) return null

  const maximumSide = 1800
  const scale = Math.min(1, maximumSide / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  scannerCanvas.width = width
  scannerCanvas.height = height
  scannerContext.drawImage(source, 0, 0, width, height)

  const pixels = scannerContext.getImageData(0, 0, width, height)
  return jsQR(pixels.data, width, height, { inversionAttempts: "attemptBoth" })?.data ?? null
}

async function loadImage(file) {
  if (typeof createImageBitmap === "function") return createImageBitmap(file)

  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("The selected image could not be opened."))
    }
    image.src = objectUrl
  })
}

globalThis.ReefTrackQRScanner = Object.freeze({
  async decodeFile(file) {
    if (!(file instanceof Blob) || (file.type && !file.type.startsWith("image/"))) {
      throw new TypeError("Select a QR code image.")
    }

    const image = await loadImage(file)
    try {
      return decodeSource(
        image,
        image.naturalWidth || image.width,
        image.naturalHeight || image.height,
      )
    } finally {
      image.close?.()
    }
  },
  decodeVideo(video) {
    if (!video || video.readyState < 2) return null
    return decodeSource(video, video.videoWidth, video.videoHeight)
  },
})
