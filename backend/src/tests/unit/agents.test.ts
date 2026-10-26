import ProfileParsingAgent from '../../agents/ProfileParsingAgent'
import SkillMatchingAgent from '../../agents/SkillMatchingAgent'
import TeamFormingAgent from '../../agents/TeamFormingAgent'
import { AgentManager } from '../../agents/AgentManager'
import { eventBus, EventType } from '../../shared/events/eventBus'
import { ResumeModel } from '../../services/resume-analysis/models'
import { randomUUID } from 'node:crypto'

jest.mock('../../config/database', () => ({ pgPool: { query: jest.fn() } }))

// Exercise the shipped event-driven contracts, not the former nonexistent
// parseResume(text, mime)/findMatches/formTeam synchronous API.
afterEach(() => jest.restoreAllMocks())

test.each([ProfileParsingAgent, SkillMatchingAgent, TeamFormingAgent])('%p can start, stop and release subscriptions', AgentType => {
  const agent = new AgentType()
  expect(agent.getStatus().isRunning).toBe(false)
  agent.start();expect(agent.getStatus().isRunning).toBe(true)
  agent.stop();expect(agent.getStatus().isRunning).toBe(false)
  agent.dispose()
})

async function upload(data: Record<string, unknown>) {
  await eventBus.publish({ id:randomUUID(), type:EventType.RESUME_UPLOADED,
    timestamp:new Date(), source:'fixture', version:'1.0', data })
}

test('resume-upload event persists actual parsed skills for its user', async () => {
  const store=jest.spyOn(ResumeModel,'findOneAndUpdate').mockResolvedValue(null)
  const agent=new ProfileParsingAgent();agent.start()
  try {
    await upload({userId:'fixture-user',originalContent:'JavaScript React Python PostgreSQL Docker'})
    expect(store).toHaveBeenCalledWith({user_id:'fixture-user'}, expect.objectContaining({
      parsed_resume:expect.objectContaining({skills:expect.arrayContaining(['JavaScript','React','Python','Docker'])})
    }), {upsert:true,new:true})
  } finally {agent.dispose()}
})

test('malformed resume event cannot write a document', async () => {
  const store=jest.spyOn(ResumeModel,'findOneAndUpdate').mockResolvedValue(null)
  const agent=new ProfileParsingAgent();agent.start()
  try {await upload({originalContent:'Python'});expect(store).not.toHaveBeenCalled()}
  finally {agent.dispose()}
})

test('stopped and disposed agents cannot process newly published resumes', async () => {
  const store=jest.spyOn(ResumeModel,'findOneAndUpdate').mockResolvedValue(null)
  const agent=new ProfileParsingAgent();agent.start();agent.dispose()
  await upload({userId:'fixture-user',originalContent:'Python'})
  expect(store).not.toHaveBeenCalled()
})

test('storage failure publishes failure and does not claim parsing success', async () => {
  jest.spyOn(ResumeModel,'findOneAndUpdate').mockRejectedValue(new Error('fixture storage failure'))
  const failed=jest.fn();const success=jest.fn()
  const removeFailed=eventBus.subscribeLegacy(EventType.RESUME_PARSING_FAILED,failed)
  const removeSuccess=eventBus.subscribeLegacy(EventType.RESUME_PARSED,success)
  const agent=new ProfileParsingAgent();agent.start()
  try {
    await upload({userId:'fixture-user',originalContent:'Python'})
    expect(failed).toHaveBeenCalled();expect(success).not.toHaveBeenCalled()
  } finally {agent.dispose();removeFailed();removeSuccess()}
})

test('manager owns its three agents and exposes consistent lifecycle state', () => {
  const manager=new AgentManager()
  try {
    expect(manager.getAgentNames().sort()).toEqual(['ProfileParsingAgent','SkillMatchingAgent','TeamFormingAgent'])
    manager.startAllAgents()
    expect(manager.getAllAgentStatuses().every(agent=>agent.isRunning)).toBe(true)
    manager.stopAllAgents()
    expect(manager.getAllAgentStatuses().every(agent=>!agent.isRunning)).toBe(true)
    expect(manager.startAgent('missing-agent')).toBe(false)
  } finally {manager.cleanup()}
  expect(manager.getAgentNames()).toEqual([])
})
