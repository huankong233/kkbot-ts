import type { fakeContext } from '@/global.d.ts'
import { retryGet } from '@/libs/axios.ts'
import { commandFormat, eventReg } from '@/libs/eventReg.ts'
import { makeLogger } from '@/libs/logger.ts'
import { retryAsync } from '@/libs/retry.ts'
import { replyMsg } from '@/libs/sendMsg.ts'
import { sleep } from '@/libs/sleep.ts'
import { getDate } from '@/libs/time.ts'
import type { CQEvent } from 'go-cqwebsocket'
import { CQ } from 'go-cqwebsocket'
import { CronJob } from 'cron'

const logger = makeLogger({ pluginName: 'zaobao' })

export default async () => {
  await init()

  event()
}

function event() {
  eventReg('message', async ({ context }, command) => {
    if (!command) return
    if (command.name === '早报') await zaobao(context, command)
  })
}

function parseData() {
  function pushObj(group: groupConfig) {
    groups[group.crontab ?? zaobaoConfig.crontab] = [
      ...(groups[group.crontab ?? zaobaoConfig.crontab] ?? []),
      {
        group_id: group.group_id,
        type: group.type ?? zaobaoConfig.type
      }
    ]
  }

  const { zaobaoConfig } = global.config as { zaobaoConfig: zaobaoConfig }

  const groups: {
    [crontab: string]: { group_id: number; type: '摸鱼人日历' | '每天60秒' }[]
  } = {}

  zaobaoConfig.groups.forEach(group => {
    if (typeof group === 'number') {
      groups[zaobaoConfig.crontab] = [
        ...(groups[zaobaoConfig.crontab] ?? []),
        {
          group_id: group,
          type: zaobaoConfig.type
        }
      ]
    } else if (Array.isArray(group)) {
      group.forEach(item => pushObj(item))
    } else {
      pushObj(group)
    }
  })

  return groups
}

async function init() {
  const { zaobaoConfig } = global.config as { zaobaoConfig: zaobaoConfig }

  if (zaobaoConfig.groups.length === 0) return

  const groups = parseData()

  for (const crontab in groups) {
    new CronJob(
      crontab,
      async () => {
        const temp: { [key: string]: string } = {}
        for (let i = 0; i < groups[crontab].length; i++) {
          const { group_id, type } = groups[crontab][i]

          let message = ''
          if (temp[type]) {
            message = temp[type]
          } else {
            message = await prepareMessage(true, type)
            temp[type] = message
          }

          const fakeContext: fakeContext = {
            message_type: 'group',
            group_id: groups[crontab][i].group_id,
            user_id: 123
          }

          await replyMsg(fakeContext, message).catch(err => {
            logger.ERROR(err)
            logger.WARNING('早报发送失败', { group_id })
          })
          await sleep(zaobaoConfig.cd * 1000)
        }
      },
      null,
      true
    )
  }
}

async function zaobao(context: CQEvent<'message'>['context'], command: commandFormat) {
  let type: zaobaoConfig['type'] = '每天60秒'
  if (command.params && command.params.length > 0 && urls.get(command.params[0]))
    type = command.params[0] as zaobaoConfig['type']

  await replyMsg(context, await prepareMessage(false, type))
}

const urls = new Map([
  [
    '每天60秒',
    {
      api: 'https://api.2xb.cn/zaob',
      checkSuccess: (data: any) => data.msg === 'Success',
      getImage: (data: any) => data.imageUrl,
      checkDate: (data: any) => data.datatime === getDate()
    }
  ],
  [
    '摸鱼人日历',
    {
      api: 'https://api.vvhan.com/api/moyu?type=json',
      checkSuccess: (data: any) => data.success,
      getImage: (data: any) => data.url,
      checkDate: () => true
    }
  ]
])

async function prepareMessage(checkDate: boolean, type?: zaobaoConfig['type']) {
  const { zaobaoConfig } = global.config as { zaobaoConfig: zaobaoConfig }
  const params = urls.get(type ?? zaobaoConfig.type)
  if (!params) throw new Error('错误的类型')

  let response

  try {
    await retryAsync(
      async () => {
        const res = await retryGet(params.api).then(res => res.data)
        if (!params['checkSuccess'](res)) {
          throw new Error('早报获取失败')
        } else if (checkDate && !params['checkDate'](res)) {
          throw new Error('时间检验失败')
        } else {
          response = res
        }
      },
      10,
      1000 * 60 * 30
    )
  } catch (error) {
    logger.WARNING('早报获取失败')
    logger.ERROR(error)
    return '早报获取失败'
  }

  if (response) {
    return CQ.image(params['getImage'](response)).toString()
  } else {
    return '早报获取失败'
  }
}
