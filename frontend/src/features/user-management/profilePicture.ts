export const PROFILE_PICTURE_ACCEPT = 'image/jpeg,image/png,image/webp'
export const PROFILE_PICTURE_MAX_BYTES = 2 * 1024 * 1024
export const PROFILE_PICTURE_SIZE = 256

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/** Returns a plain-language rejection before the browser decodes an image. */
export function profilePictureError(file: File): string | undefined {
  if (!ACCEPTED_TYPES.has(file.type)) return 'Choose a JPEG, PNG, or WebP image.'
  if (file.size > PROFILE_PICTURE_MAX_BYTES) return 'Choose an image no larger than 2 MB.'
  return undefined
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The image could not be read. Choose another file.'))
    image.src = url
  })
}

/** Center-crops and resizes an accepted image to a small WebP data URL for mock-only storage. */
export async function resizeProfilePicture(file: File): Promise<string> {
  const invalid = profilePictureError(file)
  if (invalid) throw new Error(invalid)
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    const sourceX = (image.naturalWidth - side) / 2
    const sourceY = (image.naturalHeight - side) / 2
    const canvas = document.createElement('canvas')
    canvas.width = PROFILE_PICTURE_SIZE
    canvas.height = PROFILE_PICTURE_SIZE
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser cannot prepare the profile picture.')
    context.drawImage(image, sourceX, sourceY, side, side, 0, 0, PROFILE_PICTURE_SIZE, PROFILE_PICTURE_SIZE)
    return canvas.toDataURL('image/webp', 0.82)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
