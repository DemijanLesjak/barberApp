import { LunchTime } from "./LunchTime"

export interface WorkHour {
  id: number
  day: number
  startHour: number
  endHour: string
  lunchTime?: LunchTime
}