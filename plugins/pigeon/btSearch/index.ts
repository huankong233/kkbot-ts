import { retryGet } from '@/libs/axios.ts'
import type { commandFormat } from '@/libs/eventReg.ts'
import { eventReg, missingParams } from '@/libs/eventReg.ts'
import { makeLogger } from '@/libs/logger.ts'
import { sendForwardMsg } from '@/libs/sendMsg.ts'
import type { botConfig } from '@/plugins/builtInPlugins/bot/config.d.ts'
import { add, reduce } from '@/plugins/pigeon/pigeon/index.ts'
import * as cheerio from 'cheerio'
import { SocketHandle, Text, Node, Send } from 'node-open-shamrock'

const logger = makeLogger({ pluginName: 'btSearch' })

export default () => {
  event()
}

//注册事件
function event() {
  eventReg('message', async (context, command) => {
    if (!command) return
    if (command.name.toLowerCase() === 'bt搜索') {
      await search(context, command)
    }
  })
}

//启动函数
async function search(context: SocketHandle['message'], command: commandFormat) {
  const { user_id } = context
  const { params } = command
  const { btSearchConfig } = global.config as { btSearchConfig: btSearchConfig }

  if (!(await reduce(user_id, btSearchConfig.cost, `BT搜索`))) {
    return await bot.handle_quick_operation_async({
      context,
      operation: { reply: Text({ text: `搜索失败,鸽子不足~` }) }
    })
  }

  if (await missingParams(context, command, 1)) return

  const keyword = params[0]
  const page = parseInt(params[1] ?? '1')
  let messages: Send['node'][] | boolean = false

  try {
    const html = await getInfo(keyword, page)
    const data = parser(html)
    messages = makeMessages(data, page, keyword)
  } catch (error) {
    logger.WARNING('获取信息失败')
    logger.ERROR(error)
    await bot.handle_quick_operation_async({
      context,
      operation: { reply: Text({ text: '获取信息失败' }) }
    })
    await add(user_id, btSearchConfig.cost, `BT搜索失败`)
  }

  try {
    if (!messages) {
      await bot.handle_quick_operation_async({
        context,
        operation: { reply: Text({ text: '没有搜索结果' }) }
      })
    } else {
      await sendForwardMsg(context, messages)
    }
  } catch (error) {
    logger.WARNING('发送失败')
    logger.ERROR(error)
    await bot.handle_quick_operation_async({
      context,
      operation: { reply: Text({ text: '发送失败,请尝试私聊' }) }
    })
    await add(user_id, btSearchConfig.cost, `BT搜索失败`)
  }
}

async function getInfo(keyword: string, page: number) {
  const { btSearchConfig } = global.config as { btSearchConfig: btSearchConfig }
  return retryGet(`${btSearchConfig.api}/search/${keyword}/${page}`).then(res => res.data)
}

interface parsedData {
  pageNumber: number
  data: { name: string; size: string; date: string; seed: string }[] | '没有搜索结果'
}

function parser(html: string): parsedData {
  const $ = cheerio.load(html, { decodeEntities: true })
  const pageNumber = parseInt($('.pagination a').eq(-2).html() ?? '1')
  const data = $('#archiveResult').text().includes('No result')
    ? '没有搜索结果'
    : $('#archiveResult tr')
        .map((index, item) => {
          if (index === 0) return
          const seed = $(item).find('td:nth-child(4) a:nth-child(2)').attr('href')

          return {
            name: $(item).find('td:nth-child(1)').text() ?? '空',
            size: $(item).find('td:nth-child(2)').text() ?? '空',
            date: $(item).find('td:nth-child(3)').text() ?? '空',
            seed: seed?.match(/magnet:\?xt=urn:btih:[A-Z0-9]{40}/)?.[0] ?? '空'
          }
        })
        .filter(v => v !== undefined)
        .toArray()

  return {
    pageNumber,
    data
  }
}

function makeMessages(info: parsedData, nowPage: number, keyword: string) {
  const { pageNumber, data } = info
  const { botConfig } = global.config as { botConfig: botConfig }

  if (data === '没有搜索结果') {
    return false
  } else {
    let messages = [
      Node({
        content: Text({
          text: [
            `现在是第 ${nowPage} 页 共有 ${pageNumber} 页`,
            `可使用命令"${botConfig.prefix}BT搜索 ${keyword} 指定页数"来进行翻页`
          ].join('\n')
        })
      })
    ]

    data.forEach(datum => {
      messages.push(
        Node({
          content: Text({
            text: [
              `文件名: ${datum.name}`,
              `创建时间: ${datum.date}`,
              `文件大小: ${datum.size}`,
              `文件链接: ${datum.seed}`
            ].join('\n')
          })
        })
      )
    })

    return messages
  }
}
