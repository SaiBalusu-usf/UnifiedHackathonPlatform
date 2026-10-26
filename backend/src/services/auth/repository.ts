import { pgPool } from '../../config/database'
import type { Role } from '../../shared/middleware/rbac'

export interface AuthUser {
  id: string; email: string; username: string; firstName: string; lastName: string
  password: string; role: Role; isEmailVerified: boolean; twoFactorEnabled: boolean
  tokenVersion: number; createdAt: Date; updatedAt: Date; lastLoginAt?: Date
  oauthProviders: Record<string, unknown>
}

function fromRow(row: Record<string, any>): AuthUser {
  return {
    id: row.user_id, email: row.email, username: row.username,
    firstName: row.first_name, lastName: row.last_name, password: row.password_hash,
    role: row.role, isEmailVerified: row.is_email_verified, twoFactorEnabled: row.two_factor_enabled,
    tokenVersion: row.token_version, createdAt: row.created_at, updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at, oauthProviders: row.oauth_providers || {}
  }
}

async function find(column: 'user_id' | 'email' | 'username', value: string) {
  const result = await pgPool.query(`SELECT * FROM users WHERE ${column} = $1`, [value])
  return result.rows[0] ? fromRow(result.rows[0]) : undefined
}
export const findUserByEmail = (email: string) => find('email', email)
export const findUserByUsername = (username: string) => find('username', username)
export const getUser = (id: string) => find('user_id', id)

export async function createUser(user: AuthUser) {
  await pgPool.query(`INSERT INTO users
    (user_id, email, username, first_name, last_name, password_hash, role,
     is_email_verified, two_factor_enabled, token_version, created_at, updated_at, oauth_providers)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
  [user.id, user.email, user.username, user.firstName, user.lastName, user.password, user.role,
    user.isEmailVerified, user.twoFactorEnabled, user.tokenVersion, user.createdAt, user.updatedAt,
    JSON.stringify(user.oauthProviders)])
}

// Compare the session version so a concurrent password change/logout cannot be undone.
export async function saveUser(user: AuthUser, expectedVersion = user.tokenVersion) {
  const result = await pgPool.query(`UPDATE users SET username=$2, first_name=$3, last_name=$4,
    password_hash=$5, is_email_verified=$6, token_version=$7, updated_at=$8, last_login_at=$9
    WHERE user_id=$1 AND token_version=$10 RETURNING user_id`,
  [user.id, user.username, user.firstName, user.lastName, user.password, user.isEmailVerified,
    user.tokenVersion, user.updatedAt, user.lastLoginAt || null, expectedVersion])
  if (!result.rows.length) throw new Error('Account changed; authenticate again')
}

export async function revokeSessions(id: string) {
  await pgPool.query('UPDATE users SET token_version=token_version+1, updated_at=CURRENT_TIMESTAMP WHERE user_id=$1', [id])
}
