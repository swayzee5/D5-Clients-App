export interface Client {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  birthDate?: string
  gender?: string
  objectives?: string
  isActive: boolean
  isRebootOnly: boolean
  rebootStartDate?: string
  createdAt: string
}

export interface TrainingProgram {
  id: string
  clientId: string
  name: string
  description?: string
  startDate?: string
  endDate?: string
  isActive: boolean
  sessions?: TrainingSession[]
}

export interface TrainingSession {
  id: string
  programId: string
  name: string
  dayOfWeek?: number
  orderIndex: number
  durationMinutes?: number
  notes?: string
  exercises?: Exercise[]
}

export interface Exercise {
  id: string
  sessionId: string
  name: string
  sets?: number
  reps?: string
  restSeconds?: number
  vimeoVideoId?: string
  orderIndex: number
  notes?: string
}

export interface NutritionPlan {
  id: string
  clientId: string
  name: string
  description?: string
  isActive: boolean
  days?: NutritionDay[]
}

export interface NutritionDay {
  id: string
  planId: string
  dayLabel: string
  orderIndex: number
  meals?: Meal[]
}

export interface Meal {
  id: string
  dayId: string
  name: string
  timeOfDay?: string
  description?: string
  calories?: number
  proteinsG?: number
  carbsG?: number
  fatsG?: number
  orderIndex: number
}

export interface ProgressEntry {
  id: string
  clientId: string
  entryDate: string
  weightKg?: number
  bodyFatPercent?: number
  chestCm?: number
  waistCm?: number
  hipsCm?: number
  armsCm?: number
  thighsCm?: number
  notes?: string
  photos?: ProgressPhoto[]
}

export interface ProgressPhoto {
  id: string
  progressEntryId: string
  photoUrl: string
  photoType?: "front" | "back" | "side"
}

export interface RebootDay {
  id: string
  dayNumber: number
  title: string
  description?: string
  vimeoVideoId?: string
  contentHtml?: string
  orderIndex: number
}

export interface ClientRebootProgress {
  id: string
  clientId: string
  rebootDayId: string
  completedAt?: string
}
