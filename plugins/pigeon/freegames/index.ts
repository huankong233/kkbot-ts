import { eventReg } from '@/libs/eventReg.ts'
import { makeLogger } from '@/libs/logger.ts'
import { quickOperation, sendForwardMsg } from '@/libs/sendMsg.ts'
import { sleep } from '@/libs/sleep.ts'
import { CronJob } from 'cron'
import { epicApi, steamApi } from './lib.ts'
import { Image, Node, SocketHandle, Text } from 'node-open-shamrock'

const logger = makeLogger({ pluginName: 'freegames' })

export default async () => {
  await init()

  event()
}

function event() {
  eventReg('message', async (context, command) => {
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

        await sendForwardMsg(
          {
            message_type: 'group',
            group_id
          },
          messages
        ).catch(err => {
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

async function freegames(context: SocketHandle['message']) {
  let messages
  try {
    messages = await prepareMessage()
  } catch (error) {
    logger.WARNING(`请求接口失败`)
    logger.ERROR(error)
    return await quickOperation({
      context,
      operation: {
        reply: `接口请求失败`
      }
    })
  }

  await sendForwardMsg(context, messages).catch(async () => {
    await quickOperation({
      context,
      operation: {
        reply: '发送合并消息失败，可以尝试私聊我哦~'
      }
    })
  })
}

async function prepareMessage() {
  const epic = await epicApi()
  const steam = await steamApi()

  let messages = []

  messages.push(
    Node({
      content: `今日epic共有${epic.length}个免费游戏~`
    })
  )

  epic.forEach(item => {
    messages.push(
      Node({
        content: [
          Image({
            url: item.description.image
          }),
          Text({
            text: [
              `游戏名:${item.title}`,
              `开发商:${item.author}`,
              `发行日期:${item.pubDate}`,
              `简介:${item.description.description}`,
              `购买链接:${item.link}`
            ].join('\n')
          })
        ]
      })
    )
  })

  messages.push(Node({ content: `今日steam共有${steam.length}个免费游戏~` }))

  steam.forEach(item => {
    messages.push(
      Node({
        content: [
          Image({ url: item.img as string }),
          Text({
            text: [
              `游戏名:${item.title}`,
              `发行日期:${item.releasedTime}`,
              `购买链接:${item.url}`
            ].join('\n')
          })
        ].filter(item => item !== null)
      })
    )
  })

  return messages
}
