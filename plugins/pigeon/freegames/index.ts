import type { fakeContext } from '@/global.d.ts'
import { eventReg } from '@/libs/eventReg.ts'
import { makeLogger } from '@/libs/logger.ts'
import { replyMsg, sendForwardMsg } from '@/libs/sendMsg.ts'
import { sleep } from '@/libs/sleep.ts'
import type { botData } from '@/plugins/builtInPlugins/bot/config.d.ts'
import type { CQEvent } from 'go-cqwebsocket'
import { CQ } from 'go-cqwebsocket'
import { CronJob } from 'cron'
import { epicApi, steamApi } from './lib.ts'

const logger = makeLogger({ pluginName: 'freegames' })

export default async () => {
  await init()

  event()
}

function event() {
  eventReg('message', async ({ context }, command) => {
    if (!command) return
    if (command.name === 'freegames') await freegames(context)
  })
}

async function init() {
  const { freegamesConfig } = global.config as { freegamesConfig: freegamesConfig }

  if (freegamesConfig.groups.length === 0) return
  new CronJob(
    freegamesConfig.crontab,
    async function () {
      let messages
      try {
        messages = await prepareMessage()
      } catch (error) {
        logger.WARNING(`请求接口失败`)
        logger.ERROR(error)
        return
      }

      for (let i = 0; i < freegamesConfig.groups.length; i++) {
        const group_id = freegamesConfig.groups[i]

        const fakeContext: fakeContext = {
          message_type: 'group',
          group_id,
          user_id: 0
        }

        await sendForwardMsg(fakeContext, messages).catch(err => {
          logger.ERROR(err)
          logger.WARNING('发送每日免费游戏失败', { group_id })
        })
        await sleep(freegamesConfig.cd * 1000)
      }
    },
    null,
    true
  )
}

async function freegames(context: CQEvent<'message'>['context']) {
  let messages
  try {
    messages = await prepareMessage()
  } catch (error) {
    logger.WARNING(`请求接口失败`)
    logger.ERROR(error)
    return await replyMsg(context, `接口请求失败`, { reply: true })
  }
  await sendForwardMsg(context, messages).catch(async () => {
    await replyMsg(context, '发送合并消息失败，可以尝试私聊我哦~', { reply: true })
  })
}

async function prepareMessage() {
  const { botData } = global.data as { botData: botData }
  const epic = await epicApi()
  const steam = await steamApi()

  let messages = []

  messages.push(
    CQ.node(botData.info.nickname, botData.info.user_id, `今日epic共有${epic.length}个免费游戏~`)
  )

  epic.forEach(item => {
    messages.push(
      CQ.node(
        botData.info.nickname,
        botData.info.user_id,
        [
          `${CQ.image(item.description.image)}`,
          `游戏名:${item.title}`,
          `开发商:${item.author}`,
          `发行日期:${item.pubDate}`,
          `简介:${item.description.description}`,
          `购买链接:${item.link}`
        ].join('\n')
      )
    )
  })

  messages.push(
    CQ.node(botData.info.nickname, botData.info.user_id, `今日steam共有${steam.length}个免费游戏~`)
  )

  steam.forEach(item => {
    messages.push(
      CQ.node(
        botData.info.nickname,
        botData.info.user_id,
        [
          item.img ? `${CQ.image(item.img)}` : null,
          `游戏名:${item.title}`,
          `发行日期:${item.releasedTime}`,
          `购买链接:${item.url}`
        ].join('\n')
      )
    )
  })

  return messages
}
