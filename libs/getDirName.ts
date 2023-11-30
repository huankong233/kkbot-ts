import path from 'path'
import url from 'url'

/**
 * 获取当前文件的路径
 * @param importMeta 获取方式:import.meta
 * @returns 当前文件的路径
 */
export function getDir(importMeta: ImportMeta): string {
  return path.dirname(url.fileURLToPath(importMeta.url))
}
