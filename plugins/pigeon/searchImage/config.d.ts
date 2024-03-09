import { CQEvent } from 'go-cqwebsocket'

export interface searchImageConfig {
  reduce: number
  back: number
  limit: number
  limit2: number
  ascii2dProxy: boolean
  autoLeave: number
  word: {
    on: string
    off: string
    on_reply: string
    off_reply: string
    receive: string
  }
}

export interface searchImageData {
  users: { surplus_time: number; context: CQEvent<'message'>['context'] }[]
}

export interface searchImageCallback {
  name: string
  callback: Function
  params: any
}

export type searchImageResult = searchImageSuccessResult | searchImageFailResult

export interface searchImageSuccessResult {
  success: true
  name: string
  res: any
  cost: number
}

export interface searchImageFailResult {
  success: false
  name: string
}
