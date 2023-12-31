import { deleteFolder } from '@/libs/fs.ts'
import { getDir } from '@/libs/getDirName.ts'
import { globalReg } from '@/libs/globalReg.ts'
import { loadPlugin } from '@/libs/loadPlugin.ts'
import { getPackage } from '@/libs/loadVersion.ts'
import fs from 'fs'
import path from 'path'

export default async function () {
  //修改时区
  process.env.TZ = 'Asia/Shanghai'

  // 是否启用DEBUG模式
  const isDebug = typeof process.argv.find(item => item === '--debug') !== 'undefined'
  const isDeV = typeof process.argv.find(item => item === '--dev') !== 'undefined'

  // 初始化变量
  globalReg({
    plugins: {},
    config: {},
    data: {},
    debug: isDebug || isDeV,
    dev: isDeV,
    baseDir: getDir(import.meta)
  })

  // 获取 package.json 内容
  globalReg({ packageData: await getPackage() })

  // 记录日志
  await loadPlugin('log', './plugins/builtInPlugins')

  // 清空 temp 文件夹
  const tempDir = path.join(global.baseDir, 'temp')

  if (fs.existsSync(tempDir)) {
    //删除temp文件夹内的所有文件
    deleteFolder(tempDir)
    //创建文件夹
    fs.mkdirSync(tempDir)
  } else {
    fs.mkdirSync(tempDir)
  }
}
