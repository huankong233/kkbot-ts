import { eventReg } from '@/libs/eventReg.ts'
import { downloadFile } from '@/libs/fs.ts'
import { getUniversalImgURL } from '@/libs/handleUrl.ts'
import { makeLogger } from '@/libs/logger.ts'
import { quickOperation, sendForwardMsg } from '@/libs/sendMsg.ts'
import type { botConfig } from '@/plugins/builtInPlugins/bot/config.d.ts'
import { add, reduce } from '@/plugins/pigeon/pigeon/index.ts'
import fs from 'fs'
import { AnimeTrace, IqDB, SauceNAO, TraceMoe, ascii2d } from 'image_searcher'
import type {
  searchImageCallback,
  searchImageConfig,
  searchImageFailResult,
  searchImageResult,
  searchImageSuccessResult
} from './config.d.ts'
import {
  isSearchMode,
  refreshTimeOfAutoLeave,
  searchInitialization,
  turnOffSearchMode,
  turnOnSearchMode
} from './control.ts'
import { Parser } from './parse.ts'
import {
  Image,
  Node,
  SendMessageArray,
  SocketHandle,
  Text,
  convertCQCodeToJSON
} from 'node-open-shamrock'

export const logger = makeLogger({ pluginName: 'searchImage' })

export default () => {
  //初始化搜图
  searchInitialization()
  //注册事件
  event()
}

function event() {
  const { botConfig, searchImageConfig } = global.config as {
    botConfig: botConfig
    searchImageConfig: searchImageConfig
  }

  eventReg('message', async (context, command) => {
    if (!command) return

    if (command.name === `${botConfig.botName}${searchImageConfig.word.on}`) {
      await turnOnSearchMode(context)
    }
  })

  eventReg(
    'message',
    async (context, command) => {
      if (isSearchMode(context.user_id)) {
        if (command && command.name === `${searchImageConfig.word.off}${botConfig.botName}`) {
          // 退出搜图模式
          return await turnOffSearchMode(context)
        }

        await search(context)
        return 'quit'
      }
    },
    100
  )
}

async function search(context: SocketHandle['message']) {
  const { user_id } = context
  const { searchImageConfig } = global.config as { searchImageConfig: searchImageConfig }

  //先下载文件
  let messageArray =
    typeof context.message === 'string' ? convertCQCodeToJSON(context.message) : context.message

  let receive = false

  for (let i = 0; i < messageArray.length; i++) {
    const message = messageArray[i]
    if (message.type === 'image') {
      //扣除鸽子
      if (!(await reduce(user_id, searchImageConfig.reduce, '搜图'))) {
        return await quickOperation({
          context,
          operation: {
            reply: `搜索失败,鸽子不足~`
          }
        })
      }

      if (!receive) {
        receive = true
        await quickOperation({
          context,
          operation: {
            reply: `${searchImageConfig.word.receive}`
          }
        })
      }

      //刷新时间
      refreshTimeOfAutoLeave(context.user_id)

      await imageHandler(context, message.data.url)
    }
  }
}

async function imageHandler(context: SocketHandle['message'], url: string) {
  const { searchImageConfig } = global.config as { searchImageConfig: searchImageConfig }

  //图片url
  const imageUrl = getUniversalImgURL(url)
  const imagePath = await downloadFile(imageUrl)

  const requestParams: searchImageCallback[] = [
    {
      name: 'ascii2d',
      callback: ascii2d,
      params: {
        type: 'bovw',
        proxy: searchImageConfig.ascii2dProxy,
        imagePath
      }
    },
    {
      name: 'SauceNAO',
      callback: SauceNAO,
      params: {
        hide: false,
        imagePath
      }
    },
    {
      name: 'IqDB',
      callback: IqDB,
      params: {
        discolor: false,
        services: [
          'danbooru',
          'konachan',
          'yandere',
          'gelbooru',
          'sankaku_channel',
          'e_shuushuu',
          'zerochan',
          'anime_pictures'
        ],
        imagePath
      }
    },
    {
      name: 'TraceMoe',
      callback: TraceMoe,
      params: {
        cutBorders: true,
        imagePath
      }
    },
    {
      name: 'AnimeTraceAnime',
      callback: AnimeTrace,
      params: {
        model: 'anime_model_lovelive',
        mode: 0,
        preview: true,
        imagePath
      }
    },
    {
      name: 'AnimeTraceGame',
      callback: AnimeTrace,
      params: {
        model: 'game_model_kirakira',
        mode: 0,
        preview: true,
        imagePath
      }
    }
  ]

  const responseData = await request(requestParams)

  await parse(context, responseData, imageUrl)

  //删除文件
  fs.unlinkSync(imagePath)
}

//运行函数防止崩溃
async function request(callbacks: searchImageCallback[]): Promise<searchImageResult[]> {
  let promises = []
  let AnimeTraceGame = null

  for (let i = 0; i < callbacks.length; i++) {
    const item = callbacks[i]
    if (item.name === 'AnimeTraceGame') {
      AnimeTraceGame = item
      continue
    }

    promises.push(
      (async () => {
        try {
          if (debug) logger.DEBUG(`[搜图] 引擎:${item.name}搜索中`)
          const start = performance.now()
          let obj = {
            success: true,
            name: item.name,
            res: await item.callback(item.params),
            cost: 0
          }
          const end = performance.now()
          obj.cost = end - start
          if (debug) logger.DEBUG(`[搜图] 引擎:${item.name}搜索完成`)
          return obj as searchImageSuccessResult
        } catch (error) {
          logger.WARNING(`[搜图] 引擎:${item.name}搜索失败`)
          logger.ERROR(error)
          return { success: false, name: item.name } as searchImageFailResult
        }
      })()
    )
  }

  const response = await Promise.all(promises)

  // 请求AnimeTraceGame
  if (AnimeTraceGame) {
    try {
      if (debug) logger.DEBUG(`[搜图] 引擎:${AnimeTraceGame.name}搜索中`)
      const start = performance.now()
      let obj = {
        success: true,
        name: AnimeTraceGame.name,
        res: await AnimeTraceGame.callback(AnimeTraceGame.params),
        cost: 0
      }
      const end = performance.now()
      obj.cost = end - start
      if (debug) logger.DEBUG(`[搜图] 引擎:${AnimeTraceGame.name}搜索完成`)
      response.push(obj as searchImageSuccessResult)
    } catch (error) {
      logger.WARNING(`[搜图] 引擎:${AnimeTraceGame.name}搜索失败`)
      logger.ERROR(error)
      response.push({ success: false, name: AnimeTraceGame.name } as searchImageFailResult)
    }
  }

  return response
}

//整理数据
async function parse(
  context: SocketHandle['message'],
  res: searchImageResult[],
  originUrl: string
) {
  const { user_id } = context
  const { searchImageConfig } = global.config as { searchImageConfig: searchImageConfig }

  let promises = []

  for (let i = 0; i < res.length; i++) {
    promises.push(
      (async () => {
        const datum = res[i]
        if (debug) logger.DEBUG(`[搜图] 引擎:${datum.name}数据处理中`)
        if (!datum.success) {
          //赔偿
          await add(user_id, searchImageConfig.back, `${datum.name}搜图失败赔偿`)
          return Node({
            content: `${datum.name}搜图失败力~已赔偿鸽子${searchImageConfig.back}只`
          })
        }

        let message: SendMessageArray = [
          Text({ text: `${datum.name}(耗时:${Math.floor(datum.cost)}ms):\n` })
        ]
        if (datum.res.length === 0) {
          message.push(Text({ text: '没有搜索结果~' }))
        } else {
          let limit =
            datum.res.length >= searchImageConfig.limit ? searchImageConfig.limit : datum.res.length

          for (let i = 0; i < limit; i++) {
            const item = datum.res[i]
            message.push(...(await Parser[datum.name](item)))
          }
        }

        if (debug) logger.DEBUG(`[搜图] 引擎:${datum.name}数据处理完成`)

        const node = Node({ content: message })
        return node
      })()
    )
  }

  const messages = [Node({ content: Image({ url: originUrl }) }), ...(await Promise.all(promises))]

  //发送
  await sendForwardMsg(context, messages).catch(async () => {
    await quickOperation({
      context,
      operation: {
        reply: '发送合并消息失败，可以尝试私聊我哦~(鸽子已返还)'
      }
    })
    await add(user_id, searchImageConfig.reduce, `搜图合并消息发送失败赔偿`)
  })
}
