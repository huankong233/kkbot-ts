import { retryGet } from '@/libs/axios.ts'
import type { commandFormat } from '@/libs/eventReg.ts'
import { eventReg, missingParams } from '@/libs/eventReg.ts'
import { makeLogger } from '@/libs/logger.ts'
import { replyMsg } from '@/libs/sendMsg.ts'
import type { botData } from '@/plugins/builtInPlugins/bot/config.d.ts'
import type { CQEvent } from 'go-cqwebsocket'
import { CQ } from 'go-cqwebsocket'
import { add, reduce } from '../pigeon/index.ts'

const logger = makeLogger({ pluginName: 'vits' })

export default async () => {
  if (await init()) {
    event()
  }
}

async function init() {
  const { botData } = global.data as { botData: botData }
  // 检查ffmpeg
  if (botData.ffmpeg) {
    return true
  } else {
    logger.WARNING('缺少ffmpeg')
    return false
  }
}

//注册事件
function event() {
  eventReg('message', async ({ context }, command) => {
    if (!command) return
    if (command.name === 'vits') await Vits(context, command)
  })
}

async function Vits(context: CQEvent<'message'>['context'], command: commandFormat) {
  const { vitsConfig } = global.config as { vitsConfig: vitsConfig }
  const { vitsData } = global.data as { vitsData: vitsData }
  const { user_id } = context
  const { params } = command

  if (await missingParams(context, command, 2)) return

  const id = parseFloat(params[0])

  if (!vitsData.speakers) await getList()

  if (!vitsData.speakers.get(id)) {
    return await replyMsg(context, `此id不存在,可前往 ${vitsConfig.helpUrl} 查看有哪些id`)
  }

  const text = CQ.unescape(params[1])
  if (!text) {
    return await replyMsg(context, '你还没告诉我要说什么呢')
  }

  if (!(await reduce(user_id, vitsConfig.cost, `Vits生成`))) {
    return await replyMsg(context, `生成失败,鸽子不足~`)
  }

  let response

  try {
    response = await retryGet(`${vitsConfig.url}/vits?text=${text}&id=${id}`, {
      responseType: 'arraybuffer'
    }).then(res => res.data)
  } catch (error) {
    await replyMsg(context, '获取语音文件失败')
    await add(user_id, vitsConfig.cost, `Vits生成失败`)
    logger.WARNING('获取语音文件失败')
    logger.ERROR(error)
    return
  }

  const decoder = new TextDecoder('utf-8')
  const resTxt = decoder.decode(response)

  if (resTxt.includes('500') || resTxt.includes('404')) {
    await replyMsg(context, '模型未适配，请使用其他模型')
    await add(user_id, vitsConfig.cost, `Vits生成失败`)
    return
  }

  const base64 = Buffer.from(response).toString('base64')
  await replyMsg(context, CQ.record(`base64://${base64}`).toString())
}

async function getList() {
  const { vitsConfig } = global.config as { vitsConfig: vitsConfig }
  const { vitsData } = global.data as { vitsData: vitsData }

  let data
  try {
    data = await retryGet(`${vitsConfig.url}/speakers`).then(res => res.data)
  } catch (error) {
    logger.WARNING('请求speakers失败')
    return
  }

  if (!data.VITS.length) {
    logger.WARNING('[VITS] empty model list', data)
    return
  }

  const voiceMap: Map<number, VITS> = new Map(data.VITS.map((item: VITS) => [item.id, item]))

  vitsData.speakers = voiceMap
}
