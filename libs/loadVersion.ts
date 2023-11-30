import fs from 'fs'
import { jsonc } from 'jsonc'
import path from 'path'

/**
 * 加载框架信息
 */
export const getPackage = () =>
  jsonc.parse(
    fs.readFileSync(path.join(global.baseDir, 'package.json'), {
      encoding: 'utf-8'
    })
  )
