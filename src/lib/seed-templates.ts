import { db } from "@/lib/db";

const defaultTemplates = [
  {
    name: "Code Review Assistant",
    description: "Analyze code for bugs, performance issues, and best practices",
    category: "coding",
    content: `Please review the following {{language}} code and provide feedback on:
1. Potential bugs or errors
2. Performance optimizations
3. Code style and best practices
4. Security concerns
5. Suggestions for improvement

Code to review:
\`\`\`{{language}}
{{code}}
\`\`\``,
    variables: {
      language: { description: "Programming language", example: "javascript" },
      code: { description: "The code to review" },
    },
    example: "Review this JavaScript function for potential issues and improvements",
    icon: "code",
  },
  {
    name: "Blog Post Outline",
    description: "Create a comprehensive outline for a blog post",
    category: "writing",
    content: `Create a detailed blog post outline about {{topic}}.

Target audience: {{audience}}
Desired length: {{length}} words
Tone: {{tone}}

Include:
- Engaging introduction
- Main sections with subpoints
- Key takeaways
- Call to action`,
    variables: {
      topic: { description: "Blog post topic", example: "AI in Healthcare" },
      audience: { description: "Target readers", example: "healthcare professionals" },
      length: { description: "Word count", example: "1500" },
      tone: { description: "Writing tone", example: "professional yet accessible" },
    },
    example: "Generate an outline for a blog post about AI in Healthcare",
    icon: "file-text",
  },
  {
    name: "Meeting Summary",
    description: "Summarize meeting notes into actionable items",
    category: "business",
    content: `Summarize the following meeting notes:

Meeting: {{meeting_name}}
Date: {{date}}
Attendees: {{attendees}}

Notes:
{{notes}}

Please provide:
1. Key discussion points
2. Decisions made
3. Action items with owners
4. Next steps and deadlines`,
    variables: {
      meeting_name: { description: "Meeting title", example: "Q1 Planning Session" },
      date: { description: "Meeting date", example: "2024-01-15" },
      attendees: { description: "List of attendees", example: "John, Sarah, Mike" },
      notes: { description: "Raw meeting notes" },
    },
    example: "Transform raw meeting notes into a structured summary",
    icon: "briefcase",
  },
  {
    name: "Data Analysis Prompt",
    description: "Analyze data patterns and provide insights",
    category: "analysis",
    content: `Analyze the following {{data_type}} data and provide insights:

Data:
{{data}}

Please provide:
1. Key patterns and trends
2. Statistical summary
3. Anomalies or outliers
4. Actionable recommendations
5. Visualizations suggestions`,
    variables: {
      data_type: { description: "Type of data", example: "sales" },
      data: { description: "The data to analyze" },
    },
    example: "Analyze sales data to identify trends and opportunities",
    icon: "trending-up",
  },
  {
    name: "Creative Story Starter",
    description: "Generate creative story ideas and opening paragraphs",
    category: "creative",
    content: `Create a {{genre}} story with the following elements:

Setting: {{setting}}
Main character: {{character}}
Conflict: {{conflict}}
Mood: {{mood}}

Provide:
1. A compelling opening paragraph
2. Character background
3. Plot outline
4. Potential plot twists`,
    variables: {
      genre: { description: "Story genre", example: "science fiction" },
      setting: { description: "Where/when the story takes place", example: "Mars colony, 2150" },
      character: { description: "Main character description", example: "rebellious scientist" },
      conflict: { description: "Central conflict", example: "mysterious disappearances" },
      mood: { description: "Story atmosphere", example: "suspenseful" },
    },
    example: "Generate a science fiction story starter set on Mars",
    icon: "palette",
  },
  {
    name: "Lesson Plan Creator",
    description: "Design comprehensive lesson plans for educators",
    category: "education",
    content: `Create a lesson plan for teaching {{subject}} to {{grade_level}} students.

Topic: {{topic}}
Duration: {{duration}}
Learning objectives: {{objectives}}

Include:
1. Introduction/Hook
2. Main activities
3. Assessment methods
4. Resources needed
5. Homework/Extensions`,
    variables: {
      subject: { description: "Subject area", example: "Mathematics" },
      grade_level: { description: "Student grade level", example: "8th grade" },
      topic: { description: "Specific topic", example: "Linear equations" },
      duration: { description: "Class duration", example: "50 minutes" },
      objectives: { description: "Learning goals", example: "Solve linear equations" },
    },
    example: "Create a lesson plan for teaching linear equations to 8th graders",
    icon: "graduation-cap",
  },
  {
    name: "Customer Support Response",
    description: "Craft professional customer support responses",
    category: "chat",
    content: `Respond to the following customer inquiry:

Customer name: {{customer_name}}
Issue: {{issue}}
Product/Service: {{product}}
Customer sentiment: {{sentiment}}

Provide a response that:
1. Acknowledges their concern
2. Shows empathy
3. Provides a solution
4. Offers next steps
5. Maintains {{tone}} tone`,
    variables: {
      customer_name: { description: "Customer's name", example: "John" },
      issue: { description: "Customer's problem", example: "billing error" },
      product: { description: "Product/service name", example: "Premium Plan" },
      sentiment: { description: "Customer mood", example: "frustrated" },
      tone: { description: "Response tone", example: "professional and caring" },
    },
    example: "Respond to a frustrated customer about a billing error",
    icon: "message-square",
  },
  {
    name: "SQL Query Builder",
    description: "Generate SQL queries from natural language descriptions",
    category: "coding",
    content: `Convert the following request into an SQL query:

Database schema:
{{schema}}

Request: {{request}}

Requirements:
- Use {{database_type}} syntax
- Optimize for performance
- Include comments
- Handle edge cases`,
    variables: {
      schema: { description: "Database table structure", example: "users(id, name, email)" },
      request: { description: "What data to retrieve", example: "Find all users who signed up last month" },
      database_type: { description: "SQL dialect", example: "PostgreSQL" },
    },
    example: "Generate a PostgreSQL query to find users who signed up last month",
    icon: "code",
  },
];

export async function seedTemplates() {
  try {
    console.log("Seeding default templates...");

    for (const template of defaultTemplates) {
      const existing = await db.promptTemplate.findFirst({
        where: { name: template.name },
      });

      if (!existing) {
        await db.promptTemplate.create({
          data: {
            ...template,
            isPublic: true,
            rating: 4.5,
            usageCount: Math.floor(Math.random() * 100),
          },
        });
        console.log(`Created template: ${template.name}`);
      } else {
        console.log(`Template already exists: ${template.name}`);
      }
    }

    console.log("Template seeding completed!");
  } catch (error) {
    console.error("Error seeding templates:", error);
    throw error;
  }
}