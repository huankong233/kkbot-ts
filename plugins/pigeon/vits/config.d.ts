interface vitsConfig {
  url: string
  helpUrl: string
  cost: number
}

interface VITS {
  id: number
  lang: string[]
  name: string
}

interface vitsData {
  speakers: Map<number, VITS>
}
