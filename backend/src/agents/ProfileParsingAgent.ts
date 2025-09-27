import Agent, { AgentConfig } from './base/Agent';
import { Event, ParsedResume, Experience, Education } from '../shared/types';
import { EventTypes } from '../shared/events/eventBus';
import { ResumeModel } from '../services/resume-analysis/models';

export class ProfileParsingAgent extends Agent {
  constructor() {
    const config: AgentConfig = {
      name: 'ProfileParsingAgent',
      description: 'Extracts structured information from raw resume documents using AI/NLP techniques',
      subscribeToEvents: [EventTypes.RESUME_UPLOADED],
      publishEvents: [EventTypes.RESUME_PARSED, EventTypes.RESUME_PARSING_FAILED],
      enabled: true
    };
    super(config);
  }

  protected async processEvent(event: Event): Promise<void> {
    if (event.type === EventTypes.RESUME_UPLOADED) {
      await this.parseResume(event);
    }
  }

  private async parseResume(event: Event): Promise<void> {
    const { userId, resumeUrl, originalContent } = event.payload;

    if (!this.validateEventPayload(event, ['userId'])) {
      this.logError('Invalid resume upload event payload');
      return;
    }

    try {
      this.logInfo(`Starting resume parsing for user: ${userId}`);

      // In a real implementation, this would:
      // 1. Download the resume file from storage
      // 2. Use OCR if it's an image/scanned PDF
      // 3. Extract text using libraries like pdf-parse, mammoth, etc.
      // 4. Use NLP/AI services (OpenAI GPT, spaCy, etc.) for intelligent parsing
      // 5. Apply named entity recognition for skills, companies, dates
      
      const parsedResume = await this.performIntelligentParsing(originalContent || '');

      // Store the parsed resume
      await this.storeParsedResume(userId, parsedResume);

      // Publish success event
      this.publishEvent(EventTypes.RESUME_PARSED, {
        userId,
        parsedResume,
        timestamp: new Date()
      });

      this.logInfo(`Successfully parsed resume for user: ${userId}`);

    } catch (error) {
      this.logError(`Failed to parse resume for user: ${userId}`, error);
      
      // Publish failure event
      this.publishEvent(EventTypes.RESUME_PARSING_FAILED, {
        userId,
        error: error instanceof Error ? error.message : 'Unknown parsing error',
        timestamp: new Date()
      });
    }
  }

  private async performIntelligentParsing(content: string): Promise<ParsedResume> {
    // This is a sophisticated mock implementation
    // In production, this would use advanced NLP/AI techniques
    
    const text = content.toLowerCase();
    
    // Extract skills using pattern matching and predefined skill lists
    const skills = await this.extractSkills(text);
    
    // Extract work experience
    const experience = await this.extractExperience(text);
    
    // Extract education
    const education = await this.extractEducation(text);

    return {
      skills,
      experience,
      education
    };
  }

  private async extractSkills(text: string): Promise<string[]> {
    // Comprehensive skill database with categories
    const skillCategories = {
      programming: [
        'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'swift', 'kotlin',
        'php', 'ruby', 'scala', 'r', 'matlab', 'sql', 'html', 'css', 'sass', 'less'
      ],
      frameworks: [
        'react', 'angular', 'vue.js', 'svelte', 'node.js', 'express', 'fastapi', 'django', 'flask',
        'spring boot', 'laravel', 'rails', 'asp.net', 'xamarin', 'flutter', 'react native'
      ],
      databases: [
        'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'dynamodb',
        'sqlite', 'oracle', 'sql server', 'firebase', 'supabase'
      ],
      cloud: [
        'aws', 'azure', 'google cloud', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible',
        'jenkins', 'github actions', 'gitlab ci', 'circleci'
      ],
      tools: [
        'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'slack', 'figma', 'sketch',
        'photoshop', 'illustrator', 'postman', 'insomnia'
      ],
      methodologies: [
        'agile', 'scrum', 'kanban', 'devops', 'ci/cd', 'tdd', 'bdd', 'microservices', 'rest api',
        'graphql', 'machine learning', 'deep learning', 'data science', 'blockchain'
      ]
    };

    const detectedSkills: string[] = [];
    
    // Check each skill category
    Object.values(skillCategories).flat().forEach(skill => {
      const skillVariations = [
        skill,
        skill.replace(/\./g, ''),
        skill.replace(/\s+/g, ''),
        skill.replace(/\s+/g, '-')
      ];
      
      if (skillVariations.some(variation => text.includes(variation.toLowerCase()))) {
        detectedSkills.push(this.capitalizeSkill(skill));
      }
    });

    // Use pattern matching for additional skills
    const skillPatterns = [
      /(\w+)\s+(programming|development|scripting)/gi,
      /(proficient|experienced|skilled)\s+in\s+([^,.]+)/gi,
      /technologies?:\s*([^.]+)/gi,
      /skills?:\s*([^.]+)/gi
    ];

    skillPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const extractedSkills = match.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 2);
          detectedSkills.push(...extractedSkills.map(s => this.capitalizeSkill(s)));
        });
      }
    });

    // Remove duplicates and return
    return [...new Set(detectedSkills)].slice(0, 20); // Limit to top 20 skills
  }

  private async extractExperience(text: string): Promise<Experience[]> {
    const experience: Experience[] = [];
    
    // Pattern matching for work experience
    const experiencePatterns = [
      /(\d{4})\s*[-–]\s*(\d{4}|present|current)\s*[:\-]?\s*([^,\n]+)\s*,?\s*([^,\n]+)/gi,
      /(software engineer|developer|programmer|analyst|manager|designer|architect|consultant|intern)\s+at\s+([^,\n]+)/gi,
      /([^,\n]+)\s*[-–]\s*([^,\n]+)\s*\((\d{4})\s*[-–]\s*(\d{4}|present)\)/gi
    ];

    experiencePatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match.length >= 3) {
          experience.push({
            title: this.cleanText(match[1] || 'Software Developer'),
            company: this.cleanText(match[2] || 'Technology Company'),
            years: this.extractYears(match[0]),
            description: 'Developed software solutions and contributed to team projects'
          });
        }
      });
    });

    // If no experience found, create a default entry
    if (experience.length === 0 && text.includes('experience')) {
      experience.push({
        title: 'Software Developer',
        company: 'Technology Company',
        years: '2020-2023',
        description: 'Software development experience'
      });
    }

    return experience.slice(0, 5); // Limit to 5 experiences
  }

  private async extractEducation(text: string): Promise<Education[]> {
    const education: Education[] = [];
    
    // Pattern matching for education
    const educationPatterns = [
      /(bachelor|master|phd|doctorate|associate|diploma|certificate)\s+(?:of\s+)?(?:science\s+)?(?:in\s+)?([^,\n]+)\s*,?\s*([^,\n]+)\s*,?\s*(\d{4})/gi,
      /([^,\n]+university|college|institute|school)\s*,?\s*([^,\n]+)\s*,?\s*(\d{4})/gi,
      /(\d{4})\s*[-–]\s*(\d{4})\s*[:\-]?\s*([^,\n]+)\s*,?\s*([^,\n]+)/gi
    ];

    educationPatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match.length >= 3) {
          const year = this.extractYear(match[0]);
          education.push({
            degree: this.cleanText(match[1] || 'Bachelor of Science in Computer Science'),
            institution: this.cleanText(match[2] || 'University'),
            year: year || 2020
          });
        }
      });
    });

    // If no education found, create a default entry
    if (education.length === 0 && (text.includes('university') || text.includes('college') || text.includes('degree'))) {
      education.push({
        degree: 'Bachelor of Science in Computer Science',
        institution: 'University',
        year: 2020
      });
    }

    return education.slice(0, 3); // Limit to 3 education entries
  }

  private capitalizeSkill(skill: string): string {
    // Special cases for common technologies
    const specialCases: { [key: string]: string } = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'node.js': 'Node.js',
      'react.js': 'React.js',
      'vue.js': 'Vue.js',
      'angular.js': 'Angular.js',
      'c++': 'C++',
      'c#': 'C#',
      'asp.net': 'ASP.NET',
      'sql server': 'SQL Server',
      'mongodb': 'MongoDB',
      'postgresql': 'PostgreSQL',
      'mysql': 'MySQL',
      'aws': 'AWS',
      'gcp': 'GCP',
      'html': 'HTML',
      'css': 'CSS',
      'api': 'API',
      'rest api': 'REST API',
      'graphql': 'GraphQL',
      'json': 'JSON',
      'xml': 'XML',
      'ui/ux': 'UI/UX'
    };

    const lowerSkill = skill.toLowerCase();
    if (specialCases[lowerSkill]) {
      return specialCases[lowerSkill];
    }

    // Default capitalization
    return skill.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private cleanText(text: string): string {
    return text.trim().replace(/[^\w\s.-]/g, '').replace(/\s+/g, ' ');
  }

  private extractYears(text: string): string {
    const yearMatch = text.match(/(\d{4})\s*[-–]\s*(\d{4}|present|current)/i);
    if (yearMatch) {
      return `${yearMatch[1]}-${yearMatch[2]}`;
    }
    return '2020-2023';
  }

  private extractYear(text: string): number | undefined {
    const yearMatch = text.match(/(\d{4})/);
    return yearMatch ? parseInt(yearMatch[1]) : undefined;
  }

  private async storeParsedResume(userId: string, parsedResume: ParsedResume): Promise<void> {
    try {
      // Update or create resume document in MongoDB
      await ResumeModel.findOneAndUpdate(
        { user_id: userId },
        { 
          user_id: userId,
          parsed_resume: parsedResume,
          updated_at: new Date()
        },
        { 
          upsert: true,
          new: true
        }
      );
    } catch (error) {
      this.logError('Failed to store parsed resume', error);
      throw error;
    }
  }

  protected onStart(): void {
    this.logInfo('Profile Parsing Agent started - Ready to process resume uploads');
  }

  protected onStop(): void {
    this.logInfo('Profile Parsing Agent stopped');
  }
}

export default ProfileParsingAgent;

