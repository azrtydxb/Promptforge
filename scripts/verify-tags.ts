import { PrismaClient, Tag } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function verifyTags() {
  try {
    console.log('🔍 Verifying seeded tags...\n')
    
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' }
    })
    
    if (tags.length === 0) {
      console.log('❌ No tags found in database')
      return
    }
    
    console.log(`✅ Found ${tags.length} tags in database:\n`)
    
    // Group tags by category for better display
    const categories = {
      'AI Platforms': ['ChatGPT', 'Claude', 'Midjourney', 'Stable Diffusion', 'Gemini'],
      'Prompt Engineering': ['Few-Shot', 'Chain-of-Thought', 'Role-Playing', 'System Prompt', 'Template'],
      'Content Types': ['Code Generation', 'Writing & Copy', 'Data Analysis', 'Creative Content', 'Research & Summarization'],
      'Professional': ['Marketing', 'Education', 'Technical Documentation'],
      'Output Formats': ['Structured Data', 'Long-Form', 'Quick Reference'],
      'Use Cases': ['Debugging', 'Brainstorming', 'Productivity']
    }
    
    for (const [category, categoryTags] of Object.entries(categories)) {
      console.log(`📂 ${category}:`)
      
      for (const tagName of categoryTags) {
        const tag = tags.find((t: Tag) => t.name === tagName)
        if (tag) {
          console.log(`  ✅ ${tag.name} - ${tag.description}`)
        } else {
          console.log(`  ❌ ${tagName} - NOT FOUND`)
        }
      }
      console.log('')
    }
    
    // Show any extra tags not in our categories
    const expectedTags = Object.values(categories).flat()
    const extraTags = tags.filter((tag: Tag) => !expectedTags.includes(tag.name))

    if (extraTags.length > 0) {
      console.log('📋 Additional tags:')
      extraTags.forEach((tag: Tag) => {
        console.log(`  📌 ${tag.name} - ${tag.description}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error verifying tags:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyTags()