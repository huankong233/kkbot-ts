// 代码来自 : https://github.com/Tsuk1ko/cq-picsearcher-bot
import { retryHead } from '@/libs/axios.ts'
import { eventReg } from '@/libs/eventReg.ts'
import { makeLogger } from '@/libs/logger.ts'
import { getArticleInfo } from './libs/article.ts'
import { getDynamicInfo } from './libs/dynamic.ts'
import { getLiveRoomInfo } from './libs/live.ts'
import { getVideoInfo } from './libs/video.ts'
import {
  Image,
  ReceiveMessageArray,
  SendMessageArray,
  SendMessageObject,
  SocketHandle,
  convertCQCodeToJSON
} from 'node-open-shamrock'
import { jsonc } from 'jsonc'
import { quickOperation } from '@/libs/sendMsg.ts'

export const logger = makeLogger({ pluginName: 'bilibili' })

export default async () => {
  event()
}

function event() {
  eventReg('message', async context => await bilibiliHandler(context))
}

async function bilibiliHandler(context: SocketHandle['message']) {
  const { bilibiliConfig } = global.config as { bilibiliConfig: bilibiliConfig }
  const { getInfo } = bilibiliConfig
  if (
    !(
      bilibiliConfig.despise ||
      getInfo.getVideoInfo ||
      getInfo.getDynamicInfo ||
      getInfo.getArticleInfo ||
      getInfo.getLiveRoomInfo
    )
  ) {
    return
  }

  let { message } = context
  if (typeof message === 'string') {
    message = convertCQCodeToJSON(message) as ReceiveMessageArray
  }
  const firstMessage = message[0]

  let { url, isMiniProgram = false } =
    (() => {
      if (firstMessage.type !== 'json') return
      const data = jsonc.parse(firstMessage.data.data)

      if (firstMessage.data.data.includes('com.tencent.miniapp_01')) {
        // 小程序
        return {
          url: data?.meta?.detail_1?.qqdocurl,
          isMiniProgram: true
        }
      } else if (firstMessage.data.data.includes('com.tencent.structmsg')) {
        // 结构化消息
        return {
          url: data?.meta?.news?.jumpUrl,
          isMiniProgram: false
        }
      }
    })() || {}

  if (firstMessage.type === 'text') {
    url = firstMessage.data.text
  }

  const param = await getIdFromMsg(url)
  const { avid, bvid, dyid, arid, lrid } = param

  if (bilibiliConfig.despise && isMiniProgram && (avid || bvid || dyid || arid || lrid)) {
    await quickOperation({
      context,
      operation: { reply: Image({ url: 'https://i.loli.net/2020/04/27/HegAkGhcr6lbPXv.png' }) }
    })
  }

  if (getInfo.getVideoInfo && (avid || bvid)) {
    return await reply(context, await getVideoInfo({ aid: avid, bvid }), isMiniProgram)
  }

  if (getInfo.getDynamicInfo && dyid) {
    return await reply(context, await getDynamicInfo(dyid), isMiniProgram)
  }

  if (getInfo.getArticleInfo && arid) {
    return await reply(context, await getArticleInfo(arid), isMiniProgram)
  }

  if (getInfo.getLiveRoomInfo && lrid) {
    return await reply(context, await getLiveRoomInfo(lrid), isMiniProgram)
  }
}

async function reply(
  context: SocketHandle['message'],
  message: SendMessageArray | SendMessageObject,
  isMiniProgram: boolean
) {
  await quickOperation({
    context,
    operation: { reply: message }
  })
  if (isMiniProgram) {
    await bot.delete_message({ message_id: context.message_id })
  }
}

const getIdFromMsg = async (msg: string) => {
  const match = /((b23|acg)\.tv|bili2233.cn)\/[0-9a-zA-Z]+/.exec(msg)
  if (match) return getIdFromShortLink(`https://${match[0]}`)
  return getIdFromNormalLink(msg)
}

const getIdFromNormalLink = (link: string) => {
  const searchVideo = /bilibili\.com\/video\/(?:av(\d+)|(bv[\da-z]+))/i.exec(link) || []
  const searchDynamic =
    /t\.bilibili\.com\/(\d+)/i.exec(link) ||
    /m\.bilibili\.com\/dynamic\/(\d+)/i.exec(link) ||
    /www\.bilibili\.com\/opus\/(\d+)/i.exec(link) ||
    []
  const searchArticle = /bilibili\.com\/read\/(?:cv|mobile\/)(\d+)/i.exec(link) || []
  const searchLiveRoom = /live\.bilibili\.com\/(\d+)/i.exec(link) || []
  return {
    avid: searchVideo[1],
    bvid: searchVideo[2],
    dyid: searchDynamic[1],
    arid: searchArticle[1],
    lrid: searchLiveRoom[1]
  }
}

const getIdFromShortLink = async (shortLink: string) => {
  return await retryHead(shortLink, {
    maxRedirects: 0,
    validateStatus: status => status >= 200 && status < 400
  })
    .then(ret => getIdFromNormalLink(ret.headers.location))
    .catch(e => {
      logger.WARNING(`[error] bilibili head short link ${shortLink}`)
      logger.ERROR(e)
      return {
        avid: undefined,
        bvid: undefined,
        dyid: undefined,
        arid: undefined,
        lrid: undefined
      }
    })
}
