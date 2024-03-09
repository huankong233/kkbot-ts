import type { botConfig, botData } from './config.d.ts'
import { format } from '@/libs/eventReg.ts'
import { globalReg } from '@/libs/globalReg.ts'
import { makeLogger } from '@/libs/logger.ts'
import { SRWebsocket } from 'node-open-shamrock'
import * as emoji from 'node-emoji'

const logger = makeLogger({ pluginName: 'bot', subModule: 'connect' })
const eventLogger = logger.changeSubModule('events')

/**
 * 启动机器人,注册事件等
 */
export default async function () {
  return new Promise((resolve, reject) => {
    const { botConfig } = global.config as { botConfig: botConfig }
    const { botData } = global.data as { botData: botData }

    const bot = new SRWebsocket(botConfig.connect)

    let attempts = 1

    //注册全局变量
    globalReg({ bot })

    bot.on('socket.apiConnecting', function () {
      logger.INFO(`连接中[/api]#${attempts}`)
    })

    bot.on('socket.eventConnecting', function () {
      logger.INFO(`连接中[/event]#${attempts}`)
    })

    bot.on('socket.apiError', function (context) {
      logger.WARNING(`连接失败[/api]#${attempts}`)
      logger.ERROR(context)
    })

    bot.on('socket.eventError', function (context) {
      logger.WARNING(`连接失败[/event]#${attempts}`)
      logger.ERROR(context)

      if (!botConfig.connect.reconnection) {
        reject(`连接失败!`)
      }

      if (attempts >= botConfig.connect.reconnectionAttempts) {
        reject(`重试次数超过设置的${botConfig.connect.reconnectionAttempts}次!`)
      } else {
        setTimeout(() => bot.reconnect(), botConfig.connect.reconnectionDelay)
      }

      attempts++
    })

    bot.on('socket.apiOpen', async function () {
      logger.NOTICE(`连接成功[/api]#${attempts}`)
      if (botData.wsType === '/event') {
        await connectSuccess()
        resolve(true)
      } else {
        botData.wsType = '/api'
      }
    })

    bot.on('socket.eventOpen', async function () {
      logger.NOTICE(`连接成功[/event]#${attempts}`)
      if (botData.wsType === '/api') {
        await connectSuccess()
        resolve(true)
      } else {
        botData.wsType = '/event'
      }
    })

    initEvents()

    bot.connect()
  })
}

function initEvents() {
  const { bot, debug } = global

  //初始化事件
  global.events = {
    message: [],
    notice: [],
    request: []
  }

  //事件处理
  bot.on('message', async context => {
    const { message: events } = global.events

    if (debug) eventLogger.DEBUG(`收到信息:\n`, context)

    context.message = emoji.unemojify(context.message.toString().trim())

    for (let i = 0; i < events.length; i++) {
      try {
        const response = await events[i].callback(context, format(context.message))
        if (response === 'quit') break
      } catch (error) {
        eventLogger.WARNING(`插件${events[i].pluginName}运行出错`)
        eventLogger.ERROR(error)
        if (debug) {
          const stack = new Error().stack!.split('\n')
          logger.DEBUG(`stack信息:\n`, stack.slice(1, stack.length).join('\n'))
        }
      }
    }
  })

  bot.on('notice', async context => {
    const { notice: events } = global.events

    if (debug) eventLogger.DEBUG(`收到通知:\n`, context)

    for (let i = 0; i < events.length; i++) {
      try {
        const response = await events[i].callback(context)
        if (response === 'quit') break
      } catch (error) {
        eventLogger.WARNING(`插件${events[i].pluginName}运行出错`)
        eventLogger.ERROR(error)
        if (debug) {
          const stack = new Error().stack!.split('\n')
          logger.DEBUG(`stack信息:\n`, stack.slice(1, stack.length).join('\n'))
        }
      }
    }
  })

  bot.on('request', async context => {
    const { request: events } = global.events

    if (debug) eventLogger.DEBUG(`收到请求:\n`, context)

    for (let i = 0; i < events.length; i++) {
      try {
        const response = await events[i].callback(context)
        if (response === 'quit') break
      } catch (error) {
        eventLogger.WARNING(`插件${events[i].pluginName}运行出错`)
        eventLogger.ERROR(error)
        if (debug) {
          const stack = new Error().stack!.split('\n')
          logger.DEBUG(`stack信息:\n`, stack.slice(1, stack.length).join('\n'))
        }
      }
    }
  })
}

/**
 * 机器人连接成功
 */
export async function connectSuccess() {
  const { botConfig } = global.config as { botConfig: botConfig }
  if (dev || !botConfig.online.enable) return
  if (botConfig.admin <= 0) return logger.NOTICE('未设置管理员账户,请检查!')
  await bot.send_private_message({ user_id: botConfig.admin, message: `${botConfig.online.msg}` })
}
