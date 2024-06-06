import { Command } from '@/global.ts'
import { Logger, makeLogger } from '@/libs/logger.ts'
import { sendMsg } from '@/libs/sendMsg.ts'
import { NCWebsocket } from 'node-napcat-ts'
import { config } from './config.ts'

export default class Bot {
  #logger: Logger

  constructor() {
    this.#logger = makeLogger({ pluginName: 'bot' })
  }

  async init() {
    return new Promise((resolve, reject) => {
      const bot = new NCWebsocket(config.connect)
      let attempts = 1
      let wsType = ''

      bot.on('socket.apiConnecting', () => {
        this.#logger.INFO(`连接中[/api]#${attempts}`)
      })

      bot.on('socket.eventConnecting', () => {
        this.#logger.INFO(`连接中[/event]#${attempts}`)
      })

      bot.on('socket.apiError', (context) => {
        this.#logger.ERROR(`连接失败[/api]#${attempts}`)
        this.#logger.ERROR(context)
      })

      bot.on('socket.eventError', (context) => {
        this.#logger.ERROR(`连接失败[/event]#${attempts}`)
        this.#logger.ERROR(context)

        if (!config.reconnection.enable) reject(`连接失败!`)

        if (attempts >= config.reconnection.attempts) {
          reject(`重试次数超过设置的${config.reconnection.attempts}次!`)
        } else {
          setTimeout(() => bot.reconnect(), config.reconnection.delay)
        }

        attempts++
      })

      bot.on('socket.apiOpen', async () => {
        this.#logger.SUCCESS(`连接成功[/api]#${attempts}`)
        if (wsType === '/event') {
          await this.connectSuccess(bot)
          resolve(true)
        } else {
          wsType = '/api'
        }
      })

      bot.on('socket.eventOpen', async () => {
        this.#logger.SUCCESS(`连接成功[/event]#${attempts}`)
        if (wsType === '/api') {
          await this.connectSuccess(bot)
          resolve(true)
        } else {
          wsType = '/event'
        }
      })

      if (isDev) {
        bot.on('message', async (context) => this.#logger.DEBUG('收到信息: \n', context))
        bot.on('notice', async (context) => this.#logger.DEBUG('收到通知: \n', context))
        bot.on('request', async (context) => this.#logger.DEBUG('收到请求: \n', context))
      }

      bot.connect()
    })
  }

  async connectSuccess(bot: NCWebsocket) {
    global.bot = bot

    this.initEvents()

    if (isDev || !config.online) return
    if (config.online.to <= 0) return this.#logger.INFO('未设置发送账户,请注意~')

    try {
      await sendMsg({ message_type: 'private', user_id: config.online.to }, config.online.msg)
    } catch (error) {
      this.#logger.ERROR('发送上线信息失败!')
      this.#logger.DEBUG(error)
    }
  }

  parseMessage(message: string): Command | false {
    const messageArr = message.split(' ')
    return {
      name: messageArr[0],
      args: messageArr.slice(1)
    }
  }

  initEvents() {
    global.events = {
      message: [],
      notice: [],
      request: []
    }

    bot.on('message', async (context) => {
      context.message = context.message.trim()

      const messageEvents = events.message

      for (let i = 0; i < messageEvents.length; i++) {
        try {
          const response = await messageEvents[i].callback(
            context,
            this.parseMessage(context.message)
          )
          if (response === 'quit') break
        } catch (error) {
          this.#logger.ERROR(`插件 ${messageEvents[i].pluginName} 运行出错`)
          this.#logger.ERROR(error)

          const stack = new Error().stack!.split('\n')
          this.#logger.DEBUG(`stack信息:\n`, stack.slice(1, stack.length).join('\n'))
        }
      }
    })

    bot.on('notice', async (context) => {
      const noticeEvents = events.notice

      for (let i = 0; i < noticeEvents.length; i++) {
        try {
          const response = await noticeEvents[i].callback(context)
          if (response === 'quit') break
        } catch (error) {
          this.#logger.ERROR(`插件 ${noticeEvents[i].pluginName} 运行出错`)
          this.#logger.ERROR(error)

          const stack = new Error().stack!.split('\n')
          this.#logger.DEBUG(`stack信息:\n`, stack.slice(1, stack.length).join('\n'))
        }
      }
    })

    bot.on('request', async (context) => {
      const requestEvents = events.request

      for (let i = 0; i < requestEvents.length; i++) {
        try {
          const response = await requestEvents[i].callback(context)
          if (response === 'quit') break
        } catch (error) {
          this.#logger.ERROR(`插件 ${requestEvents[i].pluginName} 运行出错`)
          this.#logger.ERROR(error)

          const stack = new Error().stack!.split('\n')
          this.#logger.DEBUG(`stack信息:\n`, stack.slice(1, stack.length).join('\n'))
        }
      }
    })
  }
}
