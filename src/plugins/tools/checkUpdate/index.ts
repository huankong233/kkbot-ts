import { version as local_version } from '@/../package.json'
import { eventReg } from '@/libs/eventReg.ts'
import { makeLogger, type Logger } from '@/libs/logger.ts'
import { sendMsg } from '@/libs/sendMsg.ts'
import { config as botConfig } from '@/plugins/builtIn/bot/config.ts'
import axios from 'axios'
import { compare } from 'compare-versions'
import cron from 'node-cron'
import { type MessageHandler, Structs } from 'node-napcat-ts'
import { config } from './config.ts'

export const enable = config.enable

export default class Update {
  #logger: Logger

  constructor() {
    this.#logger = makeLogger({ pluginName: 'update' })
  }

  async init() {
    eventReg({
      type: 'command',
      commandName: 'checkUpdate',
      pluginName: 'checkUpdate',
      description: '检查并推送kkbot的更新信息',
      params: [],
      callback: (context) => this.checkUpdate(context)
    })

    cron.schedule(config.cron, () => this.checkUpdate())
  }

  async checkUpdate(context?: MessageHandler['message']) {
    let remote_version = ''
    try {
      remote_version = await axios(config.packageJsonUrl).then((res) => res.data.version)
    } catch (error) {
      this.#logger.ERROR('获取最新版本号失败', error)
      await sendMsg(context ?? { message_type: 'private', user_id: botConfig.admin_id }, [
        Structs.text({
          text: ['检查更新失败', `当前版本: ${local_version}`, `请检查您的网络状况！`].join('\n')
        })
      ])
      return
    }

    if (compare(local_version, remote_version, '>=')) {
      if (!context) return
      await sendMsg(context, [
        Structs.text({
          text: [
            'kkbot无需更新哟~',
            `最新版本: ${remote_version}`,
            `当前版本: ${local_version}`
          ].join('\n')
        })
      ])
    } else {
      //需要更新，通知admin
      await sendMsg(context ?? { message_type: 'private', user_id: botConfig.admin_id }, [
        Structs.text({
          text: [
            'kkbot有更新哟~',
            `最新版本: ${remote_version}`,
            `当前版本: ${local_version}`
          ].join('\n')
        })
      ])
    }
  }
}