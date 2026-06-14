'use server'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateSeats(teamId: string, seats: number) {
  await db.subscription.update({
    where: { teamId },
    data: { seatsTotal: seats }
  })
  revalidatePath('/plans')
  return { success: true }
}
