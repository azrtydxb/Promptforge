import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 0,
    Resources: [],
  })
}
