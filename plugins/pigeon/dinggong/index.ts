import { eventReg } from '@/libs/eventReg.ts'
import { getDir } from '@/libs/getDirName.ts'
import { makeLogger } from '@/libs/logger.ts'
import { randomInt } from '@/libs/random.ts'
import { replyMsg } from '@/libs/sendMsg.ts'
import type { botData } from '@/plugins/builtInPlugins/bot/config.d.ts'
import type { CQEvent } from 'go-cqwebsocket'
import { CQ } from 'go-cqwebsocket'
import fs from 'fs'
import path from 'path'

const logger = makeLogger({ pluginName: 'dinggong' })

export default async () => {
  if (await init()) {
    event()
  }
}

function event() {
  eventReg('message', async ({ context }, command) => {
    if (!command) return
    if (command.name === '钉宫语录') await dinggong(context)
  })
}

async function init() {
  let { botData, dinggongData } = global.data as { botData: botData; dinggongData: dinggongData }
  if (botData.ffmpeg) {
    const baseDir = getDir(import.meta)
    const resourcesPath = path.join(baseDir, 'resources')
    dinggongData.records = fs
      .readdirSync(resourcesPath)
      .map(recordPath => path.join(resourcesPath, recordPath))

    return true
  } else {
    logger.WARNING('未安装ffmpeg，无法发送语音')
    return false
  }
}

async function dinggong(context: CQEvent<'message'>['context']) {
  const { dinggongData } = global.data as { dinggongData: dinggongData }
  const { records } = dinggongData
  const recordName = records[randomInt(records.length - 1, 0)]
  await replyMsg(context, path.basename(recordName, '.mp3'), { reply: true })
  //语音回复
  await replyMsg(context, CQ.record(`file:///${recordName}`).toString())
}
