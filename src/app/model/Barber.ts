import { WorkHour } from "./WorkHour"

export interface Barber {
  id: number
  firstName: string
  lastName: string
  workHours: WorkHour[]
}