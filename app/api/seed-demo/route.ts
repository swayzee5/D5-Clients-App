import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Endpoint protege — cree le compte demo Apple Reviewer
// Usage : POST /api/seed-demo { "secret": "<SEED_SECRET>" }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  if (!process.env.SEED_SECRET || body.secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email    = 'demo@d5coaching.com'
  const password = 'D5Demo2026!'

  try {
    // Verifie si le compte existe deja
    const existing = await pool.query(
      'SELECT id FROM clients WHERE email = $1',
      [email]
    )

    if (existing.rows.length > 0) {
      return NextResponse.json({
        message: 'Demo account already exists',
        email,
        password,
        id: existing.rows[0].id,
      })
    }

    const hashed = await bcrypt.hash(password, 12)

    const { rows } = await pool.query(
      `INSERT INTO clients
         (first_name, last_name, email, password, is_active, is_reboot_only, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id`,
      ['Apple', 'Reviewer', email, hashed, true, false]
    )

    return NextResponse.json({
      success: true,
      message: 'Demo account created. Assign a program via the CRM.',
      email,
      password,
      id: rows[0].id,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
