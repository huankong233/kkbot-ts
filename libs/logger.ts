import { getTime } from '@/libs/time.ts'
import clc from 'cli-color'
import { jsonc } from 'jsonc'

interface loggerParams {
  pluginName: string
  subModule?: string
  type?: 'PLUGIN' | 'SYSTEM'
}

export class Logger {
  private pluginName: string
  private subModule: string | undefined
  private type: 'PLUGIN' | 'SYSTEM'

  /**
   * 创建日志记录对象
   */
  constructor(params: loggerParams) {
    const { pluginName, subModule, type = 'PLUGIN' } = params
    this.pluginName = pluginName
    this.subModule = subModule
    this.type = type
  }

  /**
   * 统一格式输出到控制台
   * @param messages
   */
  INFO(...messages: any[]) {
    this.print(clc.blue(`[INFO]`), ...messages)
  }

  /**
   * 统一格式输出到控制台
   * @param messages
   */
  SUCCESS(...messages: any[]) {
    this.print(clc.green(`[SUCCESS]`), ...messages)
  }

  /**
   * 统一格式输出到控制台
   * @param messages
   */
  WARNING(...messages: any[]) {
    this.print(clc.red(`[WARNING]`), ...messages)
  }

  /**
   * 统一格式输出到控制台
   * @param messages
   */
  NOTICE(...messages: any[]) {
    this.print(clc.yellow(`[NOTICE]`), ...messages)
  }

  /**
   * 统一格式输出到控制台
   * @param messages
   */
  DEBUG(...messages: any[]) {
    if (!debug) throw new Error('请不要在非DEBUG模式使用DEBUG输出!')
    this.print(clc.magenta(`[DEBUG]`), ...messages)
  }

  /**
   * 用于在正确的模式输出报错
   * @param messages
   */
  ERROR(...messages: any[]) {
    global.debug ? this.DEBUG(...messages) : this.WARNING(...messages)
  }

  private formatMessages = (messages: any[]): string[] =>
    messages.map(item => {
      if (typeof item === 'string') {
        try {
          return jsonc.parse(item)
        } catch (error) {
          return item
        }
      } else if (typeof item === 'object') {
        return item
      }

      return item.toString()
    })

  private print(...messages: any[]) {
    if (typeof messages === 'string') {
      messages = [messages]
    }

    let type = this.type
    type += this.pluginName ? `:${this.pluginName}` : ''
    type += this.subModule ? `=>${this.subModule}` : ''
    console.log(
      clc.cyan(`[${getTime()}]`),
      clc.blackBright(`[${type}]`),
      ...this.formatMessages(messages)
    )
  }

  /**
   * 修改subModule名称并返回一个全新的logger
   * @param subModule 副模块名
   */
  changeSubModule(subModule: string) {
    return new Logger({
      pluginName: this.pluginName,
      type: this.type,
      subModule
    })
  }
}

/**
 * 构造一个logger输出
 */
export function makeLogger(params: loggerParams) {
  return new Logger({ ...params, type: 'PLUGIN' })
}

/**
 * 构造一个系统logger输出
 */
export function makeSystemLogger(params: loggerParams) {
  return new Logger({ ...params, type: 'SYSTEM' })
}
