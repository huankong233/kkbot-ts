/**
 * 代码来自https://github.com/Tsuk1ko/cq-picsearcher-bot
 */

import Jimp from 'jimp'

/**
 * 随机修改四角像素
 * @param img
 */
import { randomInt } from '@/libs/random.ts'
function randomModifyPixels(img: Jimp) {
  const [w, h] = [img.getWidth(), img.getHeight()]
  const pixels = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1]
  ]
  for (const [x, y] of pixels) {
    img.setPixelColor(
      Jimp.rgbaToInt(randomInt(0, 255), randomInt(0, 255), randomInt(0, 255), 1),
      x,
      y
    )
  }
}

const getRandomDeg = () => [90, -90, 180, -180][Math.floor(Math.random() * 4)]

/**
 * 图片反和谐处理
 * @param image
 * @param mode
 * @returns base64
 */
export const imgAntiShielding = async (image: Buffer, mode: number) => {
  const img = await Jimp.read(Buffer.from(image))
  if (mode === 1) {
    randomModifyPixels(img)
  } else if (mode === 2) {
    img.rotate(getRandomDeg())
  } else if (mode === 3) {
    randomModifyPixels(img)
    img.rotate(getRandomDeg())
    randomModifyPixels(img)
  } else if (mode === 4) {
    randomModifyPixels(img)
    img.rotate(getRandomDeg())
    randomModifyPixels(img)
    img.rotate(getRandomDeg())
    randomModifyPixels(img)
    img.rotate(getRandomDeg())
    randomModifyPixels(img)
  } else {
    throw new Error('你别乱写啊(')
  }

  const base64 = await img.getBase64Async(Jimp.AUTO)
  return base64.split(',')[1]
}
