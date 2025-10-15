import { PrismaClient } from '../src/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminEmail = 'admin@promptforge.com'
  const adminPassword = await bcrypt.hash('admin123', 10)

  try {
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: 'ADMIN',
        isActive: true,
        name: 'Admin User',
        username: 'admin',
      },
      create: {
        email: adminEmail,
        password: adminPassword,
        name: 'Admin User',
        username: 'admin',
        role: 'ADMIN',
        isActive: true,
        avatarType: 'INITIALS',
      },
    })
    console.log(`✅ Admin user created/updated: ${admin.email}`)
    console.log(`   Username: ${admin.username}`)
    console.log(`   Password: admin123`)
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    throw error
  }

  console.log('🎉 Database seeding completed successfully')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
