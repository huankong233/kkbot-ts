import { deleteOldestFiles } from '@/libs/fs.ts'
import { makeLogger } from '@/libs/logger.ts'
import { getDate } from '@/libs/time.ts'
import clc from 'cli-color'
import fs from 'fs'
import { jsonc } from 'jsonc'
import path from 'path'

const levelNumericalCode = {
  SUCCESS: 1,
  WARNING: 2,
  NOTICE: 3,
  INFO: 4,
  DEBUG: 5
}

const logger = makeLogger({ pluginName: 'log' })

/**
 * 重写conosle
 */
export default function rewriteConsoleLog() {
  const { logConfig } = global.config as { logConfig: logConfig }

  if (!logConfig.enable) {
    return logger.WARNING(`未开启日志功能,推荐开启`)
  }

  if (!logConfig.force && global.dev) {
    return logger.DEBUG(`处于DEV模式中,禁用日志保存功能`)
  } else if (logConfig.force) {
    logger.DEBUG(`处于DEV模式中,强制开启日志保存功能`)
  }

  if (global.debug) {
    logger.DEBUG(`处于DEBUG模式中,记录所有输出`)
  }

  const nowLevel = levelNumericalCode[logConfig.level]
  const regex = /\[(\w+)\]/

  console.log = (
    oriLogFunc =>
    (...args) => {
      if (global.debug) {
        save2File(logConfig.max, args)
      } else if (args[2]) {
        let type: null | string = args[2].match(regex)
        if (type) {
          let level =
            levelNumericalCode[type[1] as 'SUCCESS' | 'WARNING' | 'NOTICE' | 'INFO' | 'DEBUG']
          if (level && level <= nowLevel) {
            // 存储到日志中
            save2File(logConfig.max, args)
          }
        }
      }
      oriLogFunc(...args)
    }
  )(console.log)
}

/**
 * 写入日志文件内
 * @param max
 * @param msg
 */
function save2File(max: number, msg: any[]) {
  const fileDir = path.join(baseDir, 'logs')
  const filePath = path.join(fileDir, `${getDate()}.log`)

  msg = msg.map(item => {
    if (typeof item === 'string') return item

    if (typeof item === 'object') {
      // 判断是否是报错
      if (item.stack) {
        // new Error
        return item.stack
      } else {
        // object arr func
        return jsonc.stringify(item)
      }
    }

    // number...
    return item.toStrig()
  })

  const fileData = clc.strip(msg.join(' ')) + '\n'

  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir)
  }

  if (!fs.existsSync(filePath)) {
    // 如果不存在则当前文件夹文件数量+1是否超过max
    const files = fs.readdirSync(fileDir)
    if (files.length + 1 >= max) {
      deleteOldestFiles(path.join(baseDir, 'logs'), files.length + 1 - max)
    }
  }

  fs.appendFileSync(filePath, fileData)
}
