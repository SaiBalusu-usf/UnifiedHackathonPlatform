import express from 'express'
import request from 'supertest'
import { newDb } from 'pg-mem'
import { readFileSync } from 'fs'
import path from 'path'
import { createServer } from 'http'
import { io, Socket } from 'socket.io-client'

process.env.JWT_SECRET = 'test-access-material-for-local-regression-only'
process.env.JWT_REFRESH_SECRET = 'test-refresh-material-for-local-regression-only'
jest.mock('../../config/database', () => ({ pgPool: { query: jest.fn() } }))
import { WebSocketServer } from '../../shared/events/websocket'
import { pgPool } from '../../config/database'
import { createUser, getUser, saveUser, revokeSessions } from '../../services/auth/repository'
import { authenticateToken, generateTokens, verifyRefreshToken, generatePasswordResetToken,
  getGoogleUserInfo, getGitHubUserInfo } from '../../shared/middleware/auth'
import { Role, Permission, requirePermission, requireTeamRole, requireHackathonRole } from '../../shared/middleware/rbac'
import { mongoSanitizeConfig, hppProtection, xssProtection } from '../../shared/middleware/security'
import { ResumeModel } from '../../services/resume-analysis/models'
import { TrackingLogModel } from '../../services/tracking/models'
import userRoutes from '../../services/user-management/routes'
import resumeRoutes from '../../services/resume-analysis/routes'
import trackingRoutes from '../../services/tracking/routes'

const alice = '550e8400-e29b-41d4-a716-446655440001'
const bob = '550e8400-e29b-41d4-a716-446655440002'
const team = '550e8400-e29b-41d4-a716-446655440003'
const hackathon = '550e8400-e29b-41d4-a716-446655440004'
let memoryPool: { query: (sql: string, values?: unknown[]) => Promise<any> }
beforeEach(async () => {
  jest.restoreAllMocks()
  const db = newDb()
  db.public.none(readFileSync(path.join(__dirname, '../../config/init-db.sql'), 'utf8').split('-- Create indexes')[0])
  db.public.none(readFileSync(path.join(__dirname, '../../config/security-migration.sql'), 'utf8'))
  memoryPool = new (db.adapters.createPg().Pool)()
  ;(pgPool.query as jest.Mock).mockImplementation((sql, args) => memoryPool.query(sql, args))
  for (const [id, username] of [[alice, 'alice'], [bob, 'bob']]) await createUser({
    id, username, email: `${username}@example.invalid`, firstName: username, lastName: 'Fixture',
    password: 'unused-test-hash', role: Role.PARTICIPANT, isEmailVerified: false,
    twoFactorEnabled: false, tokenVersion: 0, createdAt: new Date(), updatedAt: new Date(), oauthProviders: {}
  })
  await memoryPool.query('INSERT INTO hackathons(hackathon_id,name,start_date,end_date,created_by) VALUES($1,$2,$3,$4,$5)',
    [hackathon, 'fixture', '2026-01-01', '2026-01-02', alice])
  await memoryPool.query('INSERT INTO teams(team_id,team_name,hackathon_id,created_by) VALUES($1,$2,$3,$4)', [team,'fixture',hackathon,alice])
})

function appWith(...middleware: any[]) {
  const app = express(); app.use(express.json()); app.use(...middleware)
  app.all('/resource/:id', (_req, res) => { res.json({ ok: true }) })
  return app
}
const token = (id = alice) => generateTokens({ userId: id, email: `${id === alice ? 'alice' : 'bob'}@example.invalid`, role: Role.PARTICIPANT, tokenVersion: 0 }).accessToken

test('persistent logout invalidates existing access and refresh sessions across readers', async () => {
  const tokens = generateTokens({ userId: alice, email: 'alice@example.invalid', role: Role.PARTICIPANT, tokenVersion: 0 })
  const app = appWith(authenticateToken)
  await request(app).get('/resource/1').set('Authorization', `Bearer ${tokens.accessToken}`).expect(200)
  await revokeSessions(alice)
  expect((await getUser(alice))?.tokenVersion).toBe(1)
  await request(app).get('/resource/1').set('Authorization', `Bearer ${tokens.accessToken}`).expect(401)
  expect((await verifyRefreshToken(tokens.refreshToken)).tokenVersion).not.toBe((await getUser(alice))?.tokenVersion)
})
test('stale account saves cannot undo a concurrent revocation', async () => {
  const stale = (await getUser(alice))!; await revokeSessions(alice)
  await expect(saveUser(stale)).rejects.toThrow('Account changed')
})
test('wrong-purpose token and non-Bearer scheme cannot authenticate', async () => {
  const app = appWith(authenticateToken)
  await request(app).get('/resource/1').set('Authorization', `Bearer ${generatePasswordResetToken(alice,0)}`).expect(401)
  await request(app).get('/resource/1').set('Authorization', `Basic ${token()}`).expect(401)
})
test('deleted accounts cannot reuse an unexpired access token', async () => {
  const saved = token(bob); await memoryPool.query('DELETE FROM users WHERE user_id=$1', [bob])
  await request(appWith(authenticateToken)).get('/resource/1').set('Authorization', `Bearer ${saved}`).expect(401)
})
test('team ownership checks allow its creator and reject a different authenticated account', async () => {
  const app = express(); app.use(authenticateToken)
  app.get('/teams/:id', requirePermission(Permission.TEAM_READ, { checkOwnership:true,resourceType:'team' }), (_r,s)=>{s.sendStatus(200)})
  await request(app).get(`/teams/${team}`).set('Authorization', `Bearer ${token()}`).expect(200)
  await request(app).get(`/teams/${team}`).set('Authorization', `Bearer ${token(bob)}`).expect(403)
})
test('team and hackathon role gates use persisted membership', async () => {
  const app = express();app.use(authenticateToken)
  app.get('/team/:teamId', requireTeamRole('leader'), (_r,s)=>{s.sendStatus(200)})
  app.get('/hackathon/:hackathonId', requireHackathonRole('organizer'), (_r,s)=>{s.sendStatus(200)})
  for (const endpoint of [`/team/${team}`,`/hackathon/${hackathon}`]) {
    await request(app).get(endpoint).set('Authorization', `Bearer ${token()}`).expect(200)
    await request(app).get(endpoint).set('Authorization', `Bearer ${token(bob)}`).expect(403)
  }
})
test.each(['resume','tracking'] as const)('%s ownership binds both document and authenticated user', async type => {
  const model = type === 'resume' ? ResumeModel : TrackingLogModel
  const exists = jest.spyOn(model, 'exists').mockResolvedValue(null)
  const app = express();app.use(authenticateToken)
  app.get('/resource/:id',requirePermission(type === 'resume' ? Permission.RESUME_READ : Permission.TRACKING_READ,
    { checkOwnership:true,resourceType:type }),(_r,s)=>{s.sendStatus(200)})
  await request(app).get('/resource/507f1f77bcf86cd799439011').set('Authorization',`Bearer ${token()}`).expect(403)
  expect(exists).toHaveBeenCalledWith({_id:'507f1f77bcf86cd799439011',user_id:alice})
})
test('Express 5 guards reject NoSQL operators and repeated scalar query arguments without rewriting secrets', async () => {
  const app=express();app.use(express.json(),mongoSanitizeConfig,xssProtection,hppProtection)
  app.post('/echo',(req,res)=>{res.json(req.body)})
  await request(app).post('/echo').send({ email:{$ne:null} }).expect(400)
  await request(app).post('/echo?role=admin&role=participant').send({}).expect(400)
  const secret='fixture<script>data</script>!'
  const result=await request(app).post('/echo').send({password:secret}).expect(200)
  expect(result.body.password).toBe(secret)
})
test('Google userinfo uses a header and rejects unverified email', async () => {
  const mock=jest.spyOn(global,'fetch').mockResolvedValue({ok:true,json:async()=>({id:'fixture',email:'a@example.invalid',verified_email:false})} as Response)
  await expect(getGoogleUserInfo('fixture-token')).rejects.toThrow('verified email')
  expect(mock.mock.calls[0][0]).not.toContain('fixture-token')
  expect(mock.mock.calls[0][1]?.headers).toEqual({Authorization:'Bearer fixture-token'})
})
test('GitHub rejects an account without a verified email', async () => {
  jest.spyOn(global,'fetch').mockResolvedValueOnce({ok:true,json:async()=>({id:1,email:'unverified@example.invalid'})} as Response)
    .mockResolvedValueOnce({ok:true,json:async()=>[{email:'unverified@example.invalid',verified:false,primary:true}]} as Response)
  await expect(getGitHubUserInfo('fixture-token')).rejects.toThrow('verified email')
})

test('an organizer cannot promote itself to administrator', async () => {
  await memoryPool.query('UPDATE users SET role=$1 WHERE user_id=$2', ['organizer', bob])
  const organizerToken=generateTokens({userId:bob,email:'bob@example.invalid',role:Role.ORGANIZER,tokenVersion:0}).accessToken
  const app=express();app.use(express.json());app.use('/users',userRoutes)
  await request(app).put(`/users/${bob}`).set('Authorization',`Bearer ${organizerToken}`).send({role:'admin'}).expect(403)
  expect((await getUser(bob))?.role).toBe('organizer')
})

test('resume multipart userId cannot override the authenticated owner', async () => {
  const lookup=jest.spyOn(ResumeModel,'findOne')
  const app=express();app.use('/resumes',resumeRoutes)
  await request(app).post('/resumes').set('Authorization',`Bearer ${token()}`)
    .field('userId',bob).attach('resumeFile',Buffer.from('fixture resume'),{filename:'fixture.txt',contentType:'text/plain'}).expect(403)
  expect(lookup).not.toHaveBeenCalled()
})

test('real WebSocket rejects cross-team access and stops broadcasts after session revocation', async () => {
  const http = createServer()
  const server = new WebSocketServer(http)
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve))
  const address = http.address() as { port: number }
  const clients: Socket[] = []
  async function connect(id: string) {
    const client = io(`http://127.0.0.1:${address.port}`, { auth: { token: token(id) }, transports:['websocket'], autoConnect:false, reconnection:false })
    clients.push(client)
    await new Promise<void>((resolve,reject) => { client.once('connect',resolve);client.once('connect_error',reject);client.connect() })
    return client
  }
  try {
    const unauthorized = await connect(bob)
    const denied = new Promise(resolve => unauthorized.once('authorization-error',resolve))
    unauthorized.emit('join-team',team);await denied
    expect(server.getUsersInTeam(team)).toEqual([])
    const authorized = await connect(alice)
    const joined = new Promise(resolve => authorized.once('user-joined-team',resolve))
    authorized.emit('join-team',team);await joined
    expect(server.getUsersInTeam(team)).toEqual([alice])
    const delivered = new Promise(resolve => authorized.once('fixture-message',resolve))
    server.broadcastToTeam(team,'fixture-message',{value:'public fixture'});await delivered
    const received = jest.fn();authorized.on('fixture-message',received)
    await revokeSessions(alice)
    server.broadcastToTeam(team,'fixture-message',{value:'must not arrive'})
    await new Promise(resolve=>setTimeout(resolve,100))
    expect(received).not.toHaveBeenCalled()
    const revoked = new Promise(resolve=>authorized.once('authorization-error',resolve))
    authorized.emit('send-message',{teamId:team,message:'rejected'});await revoked
  } finally {
    clients.forEach(client=>client.disconnect());server.close()
  }
})


test('an unrelated organizer cannot read another user resume or location history', async () => {
  await memoryPool.query('UPDATE users SET role=$1 WHERE user_id=$2', ['organizer', bob])
  const organizerToken=generateTokens({userId:bob,email:'bob@example.invalid',role:Role.ORGANIZER,tokenVersion:0}).accessToken
  const resumeLookup=jest.spyOn(ResumeModel,'findOne').mockResolvedValue(null)
  const locationLookup=jest.spyOn(TrackingLogModel,'find').mockImplementation(()=>{throw new Error('Unauthorized database read')})
  const app=express();app.use('/resumes',resumeRoutes);app.use('/tracking',trackingRoutes)
  await request(app).get(`/resumes/${alice}`).set('Authorization',`Bearer ${organizerToken}`).expect(403)
  await request(app).get(`/tracking/user/${alice}`).set('Authorization',`Bearer ${organizerToken}`).expect(403)
  await request(app).get(`/tracking/user/${alice}?hackathonId=${hackathon}`).set('Authorization',`Bearer ${organizerToken}`).expect(403)
  expect(resumeLookup).not.toHaveBeenCalled();expect(locationLookup).not.toHaveBeenCalled()
})


test('a hackathon organizer can read a participating user resume and scoped history', async () => {
  await memoryPool.query('UPDATE users SET role=$1 WHERE user_id=$2', ['organizer', alice])
  await memoryPool.query('INSERT INTO team_members(team_member_id,team_id,user_id,role) VALUES($1,$2,$3,$4)', ['550e8400-e29b-41d4-a716-446655440005',team,bob,'member'])
  const organizerToken=generateTokens({userId:alice,email:'alice@example.invalid',role:Role.ORGANIZER,tokenVersion:0}).accessToken
  jest.spyOn(ResumeModel,'findOne').mockResolvedValue({user_id:bob,parsed_resume:{skills:['typescript']}})
  const locationLookup=jest.spyOn(TrackingLogModel,'find').mockReturnValue({sort:()=>({limit:async()=>[]})} as any)
  const app=express();app.use('/resumes',resumeRoutes);app.use('/tracking',trackingRoutes)
  await request(app).get(`/resumes/${bob}`).set('Authorization',`Bearer ${organizerToken}`).expect(200)
  await request(app).get(`/tracking/user/${bob}?hackathonId=${hackathon}`).set('Authorization',`Bearer ${organizerToken}`).expect(200)
  expect(locationLookup).toHaveBeenCalledWith({user_id:bob,hackathon_id:hackathon})
})
