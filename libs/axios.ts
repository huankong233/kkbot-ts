import { retryAsync } from '@/libs/retry.ts'
import { AxiosRequestConfig, AxiosResponse } from 'axios'
import axios from 'axios'

// 默认超时时间 30s
axios.defaults.timeout = 300000

interface config extends AxiosRequestConfig {
  times?: number
  ms?: number
}

export async function retryGet<T = any, R = AxiosResponse<T>>(
  url: string,
  config?: config
): Promise<R> {
  return retryAsync(
    () => {
      return axios.get(url, config)
    },
    config?.times,
    config?.ms
  )
}

export async function retryPost<T = any, R = AxiosResponse<T>, D = any>(
  url: string,
  data?: D,
  config?: config
): Promise<R> {
  return retryAsync(
    () => {
      return axios.post(url, data, config)
    },
    config?.times,
    config?.ms
  )
}

export async function retryHead<T = any, R = AxiosResponse<T>>(
  url: string,
  config?: config
): Promise<R> {
  return retryAsync(
    () => {
      return axios.head(url, config)
    },
    config?.times,
    config?.ms
  )
}
