import { eventReg } from '@/libs/eventReg.ts'
import { getDir } from '@/libs/getDirName.ts'
// import { makeLogger } from '@/libs/logger.ts'
import { randomInt } from '@/libs/random.ts'
import fs from 'fs'
import { Record, SocketHandle } from 'node-open-shamrock'
import path from 'path'

// const logger = makeLogger({ pluginName: 'dinggong' })

export default async () => {
  if (await init()) {
    event()
  }
}

function event() {
  eventReg('message', async (context, command) => {
    if (!command) return
    if (command.name === '钉宫语录') await dinggong(context)
  })
}

async function init() {
  let { dinggongData } = global.data as { dinggongData: dinggongData }
  // if (botData.ffmpeg) {
  const baseDir = getDir(import.meta)
  const resourcesPath = path.join(baseDir, 'resources')
  dinggongData.records = fs
    .readdirSync(resourcesPath)
    .map(recordPath => path.join(resourcesPath, recordPath))

  return true
  // } else {
  //   logger.WARNING('未安装ffmpeg，无法发送语音')
  //   return false
  // }
}

async function dinggong(context: SocketHandle['message']) {
  const { dinggongData } = global.data as { dinggongData: dinggongData }
  const { records } = dinggongData
  const recordName = records[randomInt(records.length - 1, 0)]
  await bot.handle_quick_operation_async({
    context,
    operation: {
      reply: path.basename(recordName, '.mp3')
    }
  })

  //语音回复
  await bot.handle_quick_operation_async({
    context,
    operation: {
      reply: Record({
        file: `file:///${recordName}`
      })
    }
  })
}
