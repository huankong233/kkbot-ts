/**
 * 随机x位字符串
 * @param len 长度
 * @returns 随机后的字符串
 */
export function getRangeCode(len = 6) {
  const orgStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let returnStr = ''
  for (let i = 0; i < len; i++) {
    returnStr += orgStr.charAt(Math.floor(Math.random() * orgStr.length))
  }
  return returnStr
}

/**
 * 生成随机整数
 * @param min 最小数
 * @param max 最大数
 * @returns 随机数
 */
export function randomInt(min = 0, max = 1) {
  // 确保min和max都是整数
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 生成随机浮点数
 * @param min 最小数
 * @param max 最大数
 * @returns 随机数
 */
export function randomFloat(min = 0, max = 1) {
  return Math.random() * (max - min) + min
}
