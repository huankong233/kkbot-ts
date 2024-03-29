import { getFileBase64 } from '@/libs/fs.ts'
import { confuseURL } from '@/libs/handleUrl.ts'
import { formatTime } from '@/libs/time.ts'
import { Image, Text, SendMessageArray } from 'node-open-shamrock'

class CParser {
  [key: string]: (item: any) => Promise<SendMessageArray>

  ascii2d = async function (item: any) {
    let message = [`图片信息:${item.info}`, `链接:${confuseURL(item.source.link, true)}`]

    if (item.author && (item.author.text || item.author.link)) {
      message.push(
        `作者[${item.author.text ?? '未知'}](${
          item.author.link ? confuseURL(item.author.link, true) : '未知'
        })`
      )
    }

    message.push(``)

    return [Image({ url: item.image }), Text({ text: message.join('\n') })]
  }

  SauceNAO = async function (item: any) {
    let message = [`标题: ${item.title}`, `相似度: ${item.similarity}`, `图片信息:`]

    message.push(...joinContent(item.content))

    message.push(``)

    return [
      item.image !== 'https://saucenao.com/' || item.image !== ''
        ? Image({ file: `base64://${await getFileBase64(item.image)}` })
        : Text({ text: '' }),
      Text({ text: message.join('\n') })
    ]
  }

  IqDB = async function (item: any) {
    let message = [
      `分辨率: ${item.resolution}`,
      `相似度: ${item.similarity}`,
      `链接: ${confuseURL(item.url, true)}`,
      ``
    ]

    return [
      Image({ file: `base64://${await getFileBase64(item.image)}` }),
      Text({ text: message.join('\n') })
    ]
  }

  TraceMoe = async function (item: any) {
    let message = [
      // `预览视频:${item.video ?? '无'}`,
      `相似度: ${parseInt(item.similarity)}`,
      `文件名: ${item.filename}`,
      `动漫名: ${item.anilist.title.native}`,
      `NSFW: ${item.anilist.isAdult}`,
      `集数: ${item.episode}`,
      `大概位置: ${formatTime(item.from)}——${formatTime(item.to)}`,
      ``
    ]

    return [
      Image({ file: `base64://${await getFileBase64(item.image)}` }),
      Text({ text: message.join('\n') })
    ]
  }

  AnimeTraceAnime = async function (item: any) {
    const { searchImageConfig } = global.config

    const preview =
      item.preview !== 'fail unsupport image type'
        ? Image({ file: `base64://${item.preview}` })
        : Text({ text: '不支持处理的图片格式' })

    let message = []

    for (let i = 0; i < searchImageConfig.limit2; i++) {
      const char = item.char[i]
      message.push(`角色名: ${char.name}`, `动漫名: ${char.cartoonname}`)
    }

    return [preview, Text({ text: message.join('\n') })]
  }

  AnimeTraceGame = this.AnimeTraceAnime
}

export const Parser = new CParser()

function joinContent(data: { text: string; link: string }[]) {
  // 初始化一个空数组
  let result = []
  // 初始化一个临时字符串
  let temp = ''
  // 遍历数组中的每个对象
  for (let item of data) {
    // 如果对象有link属性，就用括号包裹link属性，并和text属性拼接成一个字符串，然后添加到临时字符串中
    if (item.link) {
      temp += `${item.text}(${item.link})`
    } else {
      // 否则，如果临时字符串不为空，就把它添加到结果数组中，并清空临时字符串
      if (temp) {
        result.push(temp)
        temp = ''
      }
      // 然后把text属性添加到临时字符串中
      temp += item.text
    }
  }
  // 如果临时字符串不为空，就把它添加到结果数组中
  if (temp) {
    result.push(temp)
  }
  // 返回结果数组
  return result
}
