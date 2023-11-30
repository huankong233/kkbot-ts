import { retryGet } from '@/libs/axios.ts'
import { getRangeCode } from '@/libs/random.ts'
import fs from 'fs'
import * as mime from 'mime-types'
import path from 'path'

/**
 * 删除文件夹
 * @param folder
 */
export const deleteFolder = (folder: string) => {
  if (fs.existsSync(folder)) {
    let files = fs.readdirSync(folder)
    files.forEach(file => {
      let dirPath = path.join(folder, file)
      if (fs.statSync(dirPath).isDirectory()) {
        deleteFolder(dirPath)
      } else {
        fs.unlinkSync(dirPath)
      }
    })
    fs.rmdirSync(folder)
  }
}

/**
 * 内部方法!!!请勿调用
 * @param url 地址
 * @param fullPath 完整路径
 * @returns
 */
async function _download(url: string, fullPath: string): Promise<string> {
  fullPath += '.temp'

  return new Promise((resolve, reject) => {
    retryGet(url, { responseType: 'arraybuffer' })
      .then(res => {
        const buffer = Buffer.from(res.data, 'binary')
        fs.writeFileSync(fullPath, buffer)
        resolve(fullPath)
      })
      .catch(error => reject(error))
  })
}

/**
 * 下载文件
 * @param url 下载链接
 * @param ext 如果是下载文件类型未知则使用的文件后缀
 * @returns 完整的下载路径
 */
export async function downloadFile(url: string, ext = '.png') {
  const fileName = getRangeCode(10)
  const outPath = path.join(baseDir, 'temp')
  const fullPath = path.join(outPath, fileName)
  const tempPath = await _download(url, fullPath)
  const contentType = mime.lookup(tempPath)
  if (contentType) {
    let extension = mime.extension(contentType)
    ext = extension ? '.' + extension : ext
  }

  fs.renameSync(tempPath, fullPath + ext)
  return fullPath + ext
}

/**
 * 删除指定数量的老文件
 * @param dirPath 路径
 * @param count 删除多少个
 */
export async function deleteOldestFiles(dirPath: string, count: number) {
  const files = fs.readdirSync(dirPath)
  const sortedFiles = await Promise.all(
    files.map(async file => {
      const filePath = path.join(dirPath, file)
      const { birthtime } = fs.statSync(filePath)
      return { file, birthtime }
    })
  )
  sortedFiles.sort((a, b) => a.birthtime.getTime() - b.birthtime.getTime())
  const oldestFiles = sortedFiles.slice(0, count).map(file => file.file)
  await Promise.all(
    oldestFiles.map(file => {
      const filePath = path.join(dirPath, file)
      return fs.unlinkSync(filePath)
    })
  )
}

/**
 * 获取指定文件的base64
 * @param url 地址
 */
export async function getFileBase64(url: string) {
  return await retryGet(url, { responseType: 'arraybuffer' })
    .then(res => res.data)
    .then(buffer => Buffer.from(buffer).toString('base64'))
}
