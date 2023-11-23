import { retryGet, retryPost } from '@/libs/axios.ts'
import { eventReg } from '@/libs/eventReg.ts'
import { confuseURL } from '@/libs/handleUrl.ts'
import { makeLogger } from '@/libs/logger.ts'
import { replyMsg } from '@/libs/sendMsg.ts'
import { isToday } from '@/libs/time.ts'
import type { CQEvent } from '@huan_kong/go-cqwebsocket'
import { CQ } from '@huan_kong/go-cqwebsocket'
import { add, reduce } from '../pigeon/index.ts'
import { imgAntiShielding } from './AntiShielding.ts'

const logger = makeLogger({ pluginName: 'setu' })

export default () => {
  event()
}

function event() {
  eventReg('message', async ({ context }, command) => {
    if (!command) return

    const { setuConfig } = global.config as { setuConfig: setuConfig }
    const match = command.name.match(setuConfig.reg)
    if (match) await handler(context, match)
  })
}

async function handler(context: CQEvent<'message'>['context'], match: RegExpMatchArray) {
  const { setuConfig, proxyConfig } = global.config as {
    setuConfig: setuConfig
    proxyConfig: proxyConfig
  }
  const { user_id } = context

  let userData = await database.select('*').where('user_id', user_id).from('setu').first()

  if (!userData) {
    // 第一次看色图
    await database.insert({ user_id }).into('setu')
    userData = { count: 0, update_time: 0 }
  }

  let { count, update_time } = userData

  if (!isToday(update_time)) {
    // 如果不是今天就清零
    count = 0
  }

  // 每天上限
  if (count >= setuConfig.limit) {
    return await replyMsg(
      context,
      CQ.image('https://api.lolicon.app/assets/img/lx.jpg').toString(),
      {
        reply: true
      }
    ).catch(
      async () => await replyMsg(context, '因此对于年轻人而言一个重要的功课就是学会去节制欲望.jpg')
    )
  }

  if (!(await reduce(user_id, setuConfig.pigeon, '看色图'))) {
    return await replyMsg(context, '你的鸽子不够哦~', { reply: true })
  }

  let requestData: {
    r18: 1 | 0
    tag: string[][]
    proxy: false | string
  } = {
    r18: match[1] ? 1 : 0,
    tag: [],
    proxy: proxyConfig.enable ? false : setuConfig.proxy.enable ? setuConfig.proxy.url : false
  }

  if (match[2]) {
    requestData.tag = match[2].split('&').map(element =>
      element.split('|').map(element => {
        // 支持前后或中间配置r18变量
        if (element.match(/[Rr]18/)) {
          requestData.r18 = 1
          return element.replace(/[Rr]18/g, '')
        } else {
          return element
        }
      })
    )
  }

  let responseData

  try {
    responseData = await retryPost('https://api.lolicon.app/setu/v2', { data: requestData }).then(
      res => res.data
    )
  } catch (error) {
    logger.WARNING('请求色图接口失败~')
    logger.ERROR(error)
    await add(user_id, setuConfig.pigeon, '请求色图接口失败~')
    return await replyMsg(context, '请求色图接口失败~', { reply: true })
  }

  if (responseData === ':D') {
    await add(user_id, setuConfig.pigeon, '机器人IP被Ban啦,换个试试吧~')
    return await replyMsg(context, '机器人IP被Ban啦,换个试试吧~', { reply: true })
  }

  if (responseData.data.length > 0) {
    responseData = responseData.data[0]
  } else {
    await add(user_id, setuConfig.pigeon, '换个标签试试吧~')
    return await replyMsg(context, '换个标签试试吧~', { reply: true })
  }

  let fullUrl = `https://www.pixiv.net/artworks/${responseData.pid}`
  let shortUrlData

  if (setuConfig.short.enable) {
    try {
      shortUrlData = await retryGet(`${setuConfig.short.url}/api/url`, {
        params: { url: fullUrl }
      }).then(res => res.data)
    } catch (error) {
      logger.WARNING('短链服务器爆炸惹~')
      logger.ERROR(error)
      await add(user_id, setuConfig.pigeon, '短链服务器爆炸惹~')
      return await replyMsg(context, '短链服务器爆炸惹~', { reply: true })
    }
  }

  const infoMessage = [
    `标题: ${responseData.title}`,
    `标签: ${responseData.tags.join(' ')}`,
    `AI作品: ${responseData.aiType ? '是' : '不是'}`,
    `作品地址: ${setuConfig.short.enable ? shortUrlData.url : confuseURL(fullUrl)}`
  ].join('\n')

  const infoMessageResponse = await replyMsg(context, infoMessage, { reply: true })

  let image

  try {
    image = await retryGet(responseData.urls.original, {
      headers: { Referer: 'https://www.pixiv.net/' },
      responseType: 'arraybuffer'
    }).then(res => res.data)
  } catch (error) {
    logger.WARNING('请求P站图片失败~')
    logger.ERROR(error)
    await add(user_id, setuConfig.pigeon, '请求P站图片失败~')
    return await replyMsg(context, '请求P站图片失败~', { reply: true })
  }

  const decoder = new TextDecoder('utf-8')
  const resTxt = decoder.decode(image)

  if (!resTxt || resTxt.includes('404')) {
    await add(user_id, setuConfig.pigeon, '这张色图被删了,真可惜~')
    return await replyMsg(context, '这张色图被删了,真可惜~', { reply: true })
  }

  let base64

  try {
    //反和谐
    base64 = await imgAntiShielding(image, setuConfig.antiShieldingMode)
  } catch (error) {
    logger.WARNING('反和谐失败')
    logger.ERROR(error)
    await add(user_id, setuConfig.pigeon, '反和谐失败')
    return await replyMsg(context, '反和谐失败惹', { reply: true })
  }

  try {
    const message = await replyMsg(context, CQ.image(`base64://${base64}`).toString())

    count++
    //更新数据
    await database
      .update({
        count,
        update_time: Date.now()
      })
      .where('user_id', user_id)
      .into('setu')

    setTimeout(async () => {
      //撤回消息
      await bot.delete_msg(message.message_id)
      await bot.delete_msg(infoMessageResponse.message_id)
    }, setuConfig.withdraw * 1000)
  } catch (error) {
    await add(user_id, setuConfig.pigeon, '色图发送失败')
    return await replyMsg(context, '色图发送失败', { reply: true })
  }
}
