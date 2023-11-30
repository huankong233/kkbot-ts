import { CQ } from 'go-cqwebsocket'

/**
 * 解析CQ:JSON
 * @param message 消息
 */
export const parseJSON = (message: string) => {
  const start = message.indexOf('{')
  const end = message.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  let jsonText = message.substring(start, end + 1)
  if (message.includes('[CQ:json,')) jsonText = CQ.unescape(jsonText)
  try {
    return JSON.parse(jsonText)
  } catch (error) {}
  return null
}
