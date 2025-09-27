import ProfileParsingAgent from '../ProfileParsingAgent';
import { EventTypes } from '../../shared/events/eventBus';
import { setupTestDatabases, teardownTestDatabases, cleanupTestData } from '../../shared/tests/setup';

describe('ProfileParsingAgent', () => {
  let agent: ProfileParsingAgent;

  beforeAll(async () => {
    await setupTestDatabases();
  });

  afterAll(async () => {
    await teardownTestDatabases();
  });

  beforeEach(async () => {
    await cleanupTestData();
    agent = new ProfileParsingAgent();
  });

  afterEach(() => {
    if (agent) {
      agent.stop();
    }
  });

  describe('Agent Configuration', () => {
    it('should have correct configuration', () => {
      const status = agent.getStatus();
      
      expect(status.name).toBe('ProfileParsingAgent');
      expect(status.description).toContain('Extracts structured information');
      expect(status.subscribeToEvents).toContain(EventTypes.RESUME_UPLOADED);
      expect(status.publishEvents).toContain(EventTypes.RESUME_PARSED);
      expect(status.publishEvents).toContain(EventTypes.RESUME_PARSING_FAILED);
    });

    it('should start and stop correctly', () => {
      expect(agent.getStatus().isRunning).toBe(false);
      
      agent.start();
      expect(agent.getStatus().isRunning).toBe(true);
      
      agent.stop();
      expect(agent.getStatus().isRunning).toBe(false);
    });
  });

  describe('Resume Parsing', () => {
    beforeEach(() => {
      agent.start();
    });

    it('should handle resume upload event', (done) => {
      const testEvent = {
        type: EventTypes.RESUME_UPLOADED,
        payload: {
          userId: 'test-user-123',
          resumeUrl: 'https://example.com/resume.pdf',
          originalContent: `
            John Doe
            Software Engineer
            
            Skills: JavaScript, React, Node.js, Python, Machine Learning
            
            Experience:
            2020-2023: Senior Developer at Tech Corp
            2018-2020: Junior Developer at StartupXYZ
            
            Education:
            2018: Bachelor of Computer Science, University of Technology
          `
        },
        timestamp: new Date(),
        source: 'test'
      };

      // Listen for parsed event
      agent.on('event-processed', (data) => {
        expect(data.event.type).toBe(EventTypes.RESUME_UPLOADED);
        done();
      });

      // Process the event
      (agent as any).processEvent(testEvent);
    });

    it('should extract skills correctly', async () => {
      const testContent = `
        Skills: JavaScript, TypeScript, React, Node.js, Python, Machine Learning, AWS, Docker
        Technologies: PostgreSQL, MongoDB, Redis
        Proficient in: Java, C++, Go
      `;

      const parsedResume = await (agent as any).performIntelligentParsing(testContent);
      
      expect(parsedResume.skills).toBeInstanceOf(Array);
      expect(parsedResume.skills.length).toBeGreaterThan(0);
      expect(parsedResume.skills).toContain('JavaScript');
      expect(parsedResume.skills).toContain('React');
      expect(parsedResume.skills).toContain('Python');
    });

    it('should extract experience correctly', async () => {
      const testContent = `
        Experience:
        2020-2023: Senior Software Engineer at Google
        2018-2020: Junior Developer at Microsoft
        2017-2018: Intern at Facebook
      `;

      const parsedResume = await (agent as any).performIntelligentParsing(testContent);
      
      expect(parsedResume.experience).toBeInstanceOf(Array);
      expect(parsedResume.experience.length).toBeGreaterThan(0);
      
      const firstExp = parsedResume.experience[0];
      expect(firstExp).toHaveProperty('title');
      expect(firstExp).toHaveProperty('company');
      expect(firstExp).toHaveProperty('years');
    });

    it('should extract education correctly', async () => {
      const testContent = `
        Education:
        2018: Bachelor of Science in Computer Science, MIT
        2020: Master of Science in Machine Learning, Stanford University
      `;

      const parsedResume = await (agent as any).performIntelligentParsing(testContent);
      
      expect(parsedResume.education).toBeInstanceOf(Array);
      expect(parsedResume.education.length).toBeGreaterThan(0);
      
      const firstEdu = parsedResume.education[0];
      expect(firstEdu).toHaveProperty('degree');
      expect(firstEdu).toHaveProperty('institution');
      expect(firstEdu).toHaveProperty('year');
    });

    it('should handle invalid event payload', (done) => {
      const invalidEvent = {
        type: EventTypes.RESUME_UPLOADED,
        payload: {
          // Missing userId
          resumeUrl: 'https://example.com/resume.pdf'
        },
        timestamp: new Date(),
        source: 'test'
      };

      // Should not crash and should handle gracefully
      (agent as any).processEvent(invalidEvent).then(() => {
        done();
      }).catch(done);
    });
  });

  describe('Skill Extraction', () => {
    it('should normalize skill names correctly', () => {
      const testSkills = ['javascript', 'react.js', 'node.js', 'c++', 'asp.net'];
      const normalized = testSkills.map(skill => (agent as any).capitalizeSkill(skill));
      
      expect(normalized).toContain('JavaScript');
      expect(normalized).toContain('React.js');
      expect(normalized).toContain('Node.js');
      expect(normalized).toContain('C++');
      expect(normalized).toContain('ASP.NET');
    });

    it('should extract skills from various formats', async () => {
      const testCases = [
        'Skills: JavaScript, Python, React',
        'Technologies: Node.js, MongoDB, AWS',
        'Proficient in Java and C++',
        'Experience with machine learning and data science'
      ];

      for (const testCase of testCases) {
        const skills = await (agent as any).extractSkills(testCase);
        expect(skills).toBeInstanceOf(Array);
        expect(skills.length).toBeGreaterThan(0);
      }
    });

    it('should limit skills to reasonable number', async () => {
      const manySkillsText = Array.from({ length: 50 }, (_, i) => `skill${i}`).join(', ');
      const skills = await (agent as any).extractSkills(`Skills: ${manySkillsText}`);
      
      expect(skills.length).toBeLessThanOrEqual(20); // Should limit to 20 skills
    });
  });
});

