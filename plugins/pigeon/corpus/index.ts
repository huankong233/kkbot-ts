import { commandFormat } from '@/libs/eventReg.ts'
import { eventReg, missingParams } from '@/libs/eventReg.ts'
import type { botConfig } from '@/plugins/builtInPlugins/bot/config.d.ts'
import { add, reduce } from '@/plugins/pigeon/pigeon/index.ts'
import { SocketHandle, convertCQCodeToJSON } from 'node-open-shamrock'

const ENUM_SCENCE = {
  a: ['private', 'group'],
  g: ['group'],
  p: ['private']
}

// 满足要求的内容
const available = {
  mode: [0, 1],
  scene: ['p', 'g', 'a']
}

export default async () => {
  await loadRules()
  event()
}

function event() {
  eventReg('message', async (context, command) => {
    const { botConfig } = global.config as { botConfig: botConfig }

    if (!command) return await corpus(context)

    if (command.name === `${botConfig.botName}学习`) {
      await learn(context, command)
    } else if (command.name === `${botConfig.botName}忘记`) {
      await forget(context, command)
    }
  })
}

function isCtxMatchScence({ message_type }: SocketHandle['message'], scence: 'a' | 'g' | 'p') {
  if (!(scence in ENUM_SCENCE)) return false
  return ENUM_SCENCE[scence].includes(message_type)
}

async function corpus(context: SocketHandle['message']) {
  const { message } = context
  const { corpusData } = global.data as { corpusData: corpusData }

  for (let { regexp, reply, scene } of corpusData.rules) {
    // 判断生效范围
    if (!isCtxMatchScence(context, scene)) continue

    // 执行正则判断
    const exec = regexp.exec(message.toString())
    if (!exec) continue

    await bot.handle_quick_operation_async({ context, operation: { reply, auto_reply: false } })
  }
}

async function loadRules() {
  const { corpusData } = global.data as { corpusData: corpusData }
  corpusData.rules = []

  const data: {
    id: number
    user_id: number
    keyword: string
    reply: string
    scene: 'a' | 'g' | 'p'
    mode: number
    hide: number
  }[] = await database.select('*').from('corpus').where('hide', 0)

  data.forEach(value => {
    let obj = {
      reply: value.reply,
      scene: value.scene,
      regexp: new RegExp(/default/)
    }

    if (value.mode === 0) {
      obj.regexp = new RegExp(value.keyword)
    } else if (value.mode === 1) {
      obj.regexp = new RegExp('^' + value.keyword + '$')
    }

    corpusData.rules.push(obj)
  })
}

// 学习
async function learn(context: SocketHandle['message'], command: commandFormat) {
  const { user_id } = context
  const { corpusConfig, botConfig } = global.config as {
    corpusConfig: corpusConfig
    botConfig: botConfig
  }
  const { params } = command

  if (await missingParams(context, command, 4)) return

  if (!(await reduce(user_id, corpusConfig.add, '添加关键字'))) {
    return await bot.handle_quick_operation_async({ context, operation: { reply: '鸽子不足~' } })
  }

  const messages = convertCQCodeToJSON(params[0])
  let keyword = 'default keyword'
  let mode = 0

  let type = null
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]
    if (type === null) {
      type = message.type
      type === 'image'
        ? ([keyword, mode] = [`\\[CQ:image,file=${message.data.url}`, 0])
        : ([keyword, mode] = [message.data.text, parseInt(params[2])])
    } else {
      await add(user_id, corpusConfig.add, '添加关键词失败')
      return await bot.handle_quick_operation_async({
        context,
        operation: { reply: '不能同时存在图片或文字哦~' }
      })
    }
  }

  const reply = params[1]
  const scene = params[3]

  //判断参数是否合法
  if (!available.mode.includes(mode)) {
    await add(user_id, corpusConfig.add, '添加关键词失败')
    return await bot.handle_quick_operation_async({
      context,
      operation: {
        reply: `模式不合法,请发送"${botConfig.prefix}帮助 ${botConfig.botName}学习"查看细节`
      }
    })
  }

  if (!available.scene.includes(scene)) {
    await add(user_id, corpusConfig.add, '添加关键词失败')
    return await bot.handle_quick_operation_async({
      context,
      operation: {
        reply: `生效范围不合法,请发送"${botConfig.prefix}帮助 ${botConfig.botName}学习"查看细节`
      }
    })
  }

  //确保不重复
  const repeat = await database.select('*').from('corpus').where({ keyword, hide: 0 })

  if (repeat.length !== 0) {
    await add(user_id, corpusConfig.add, '添加关键词失败')
    return await bot.handle_quick_operation_async({
      context,
      operation: {
        reply: `这个"关键词"已经存在啦~`
      }
    })
  }

  if (await database.insert({ user_id, keyword, mode, reply, scene }).into('corpus')) {
    await loadRules()
    await bot.handle_quick_operation_async({
      context,
      operation: {
        reply: `${botConfig.botName}学会啦~`
      }
    })
  } else {
    await add(user_id, corpusConfig.add, '添加关键词失败')
    await bot.handle_quick_operation_async({
      context,
      operation: {
        reply: '学习失败~'
      }
    })
  }
}

//忘记
async function forget(context: SocketHandle['message'], command: commandFormat) {
  const { user_id } = context
  const { corpusConfig, botConfig } = global.config as {
    corpusConfig: corpusConfig
    botConfig: botConfig
  }
  const { params } = command

  if (await missingParams(context, command, 1)) return

  if (!(await reduce(user_id, corpusConfig.delete, '删除关键词'))) {
    return await bot.handle_quick_operation_async({
      context,
      operation: {
        reply: '鸽子不足~'
      }
    })
  }

  const keyword = params[0]

  //查找是否存在这个关键字
  const data = await database.select('*').from('corpus').where({ keyword, hide: 0 }).first()

  if (!data) {
    await add(user_id, corpusConfig.delete, '删除关键词失败')
    return await bot.handle_quick_operation_async({
      context,
      operation: {
        reply: '这个关键词不存在哦~'
      }
    })
  }

  //判断所有者
  if (data.user_id !== user_id && botConfig.admin !== user_id) {
    await add(user_id, corpusConfig.delete, '删除关键词失败')
    return await bot.handle_quick_operation_async({
      context,
      operation: {
        reply: '删除失败，这不是你的词条哦'
      }
    })
  }

  if (await database('corpus').where('id', data.id).update({ hide: 1 })) {
    await loadRules()
    return await bot.handle_quick_operation_async({
      context,
      operation: {
        reply: '删除成功啦~'
      }
    })
  }
}
