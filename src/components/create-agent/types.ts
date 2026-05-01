import type { BinaryChoice } from '@/lib/traitMapper'

export type Basics = {
  name: string
  avatar: string
  age: string
  gender: string
  origin: string
  profession: string
  education: string
  hobbies: string
}

export type BinaryAnswers = (BinaryChoice | null)[]
