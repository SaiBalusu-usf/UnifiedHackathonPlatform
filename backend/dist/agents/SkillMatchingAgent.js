"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillMatchingAgent = void 0;
const Agent_1 = __importDefault(require("./base/Agent"));
const eventBus_1 = require("../shared/events/eventBus");
const models_1 = require("../services/resume-analysis/models");
const database_1 = require("../config/database");
class SkillMatchingAgent extends Agent_1.default {
    constructor() {
        const config = {
            name: 'SkillMatchingAgent',
            description: 'Identifies potential teammates based on skill compatibility and project requirements using advanced matching algorithms',
            subscribeToEvents: [eventBus_1.EventTypes.TEAM_SUGGESTION_REQUESTED, eventBus_1.EventTypes.RESUME_PARSED],
            publishEvents: [eventBus_1.EventTypes.TEAM_SUGGESTIONS_GENERATED],
            enabled: true
        };
        super(config);
        this.skillWeights = new Map();
        this.skillSynonyms = new Map();
        this.initializeSkillData();
    }
    initializeSkillData() {
        // Initialize skill weights (higher weight = more valuable/rare skill)
        const skillWeights = {
            // High-demand/specialized skills
            'Machine Learning': 10,
            'Deep Learning': 10,
            'Artificial Intelligence': 10,
            'Blockchain': 9,
            'Kubernetes': 9,
            'DevOps': 8,
            'Cloud Architecture': 8,
            'Microservices': 8,
            'Data Science': 8,
            'Cybersecurity': 8,
            // Popular frameworks/languages
            'React': 7,
            'Node.js': 7,
            'Python': 7,
            'TypeScript': 7,
            'AWS': 7,
            'Docker': 7,
            'GraphQL': 6,
            'Vue.js': 6,
            'Angular': 6,
            'Java': 6,
            // Common skills
            'JavaScript': 5,
            'HTML': 4,
            'CSS': 4,
            'SQL': 5,
            'Git': 4,
            'REST API': 5
        };
        Object.entries(skillWeights).forEach(([skill, weight]) => {
            this.skillWeights.set(skill, weight);
        });
        // Initialize skill synonyms for better matching
        const synonyms = {
            'JavaScript': ['JS', 'ECMAScript', 'ES6', 'ES2015'],
            'TypeScript': ['TS'],
            'React': ['React.js', 'ReactJS'],
            'Vue.js': ['Vue', 'VueJS'],
            'Angular': ['AngularJS', 'Angular.js'],
            'Node.js': ['Node', 'NodeJS'],
            'Python': ['Python3', 'Python 3'],
            'Machine Learning': ['ML', 'Artificial Intelligence', 'AI'],
            'Deep Learning': ['DL', 'Neural Networks'],
            'PostgreSQL': ['Postgres', 'PostGres'],
            'MongoDB': ['Mongo'],
            'Amazon Web Services': ['AWS'],
            'Google Cloud Platform': ['GCP', 'Google Cloud'],
            'Microsoft Azure': ['Azure'],
            'User Interface': ['UI'],
            'User Experience': ['UX'],
            'UI/UX': ['User Interface Design', 'User Experience Design']
        };
        Object.entries(synonyms).forEach(([mainSkill, synonymList]) => {
            this.skillSynonyms.set(mainSkill, synonymList);
        });
    }
    async processEvent(event) {
        switch (event.type) {
            case eventBus_1.EventTypes.TEAM_SUGGESTION_REQUESTED:
                await this.generateTeamSuggestions(event);
                break;
            case eventBus_1.EventTypes.RESUME_PARSED:
                await this.updateUserSkillProfile(event);
                break;
        }
    }
    async generateTeamSuggestions(event) {
        const { userId, hackathonId, requiredSkills, preferredSkills, teamSize, excludeTeamIds } = event.payload;
        if (!this.validateEventPayload(event, ['userId'])) {
            this.logError('Invalid team suggestion request payload');
            return;
        }
        try {
            this.logInfo(`Generating team suggestions for user: ${userId}`);
            const criteria = {
                userId,
                hackathonId,
                requiredSkills,
                preferredSkills,
                teamSize: teamSize || 4,
                excludeTeamIds
            };
            // Get user's profile
            const userProfile = await this.getUserProfile(userId);
            if (!userProfile) {
                this.logError(`User profile not found: ${userId}`);
                return;
            }
            // Generate different types of suggestions
            const [userSuggestions, teamSuggestions] = await Promise.all([
                this.generateUserSuggestions(userProfile, criteria),
                this.generateTeamSuggestions_Internal(userProfile, criteria)
            ]);
            const suggestions = {
                userSuggestions,
                teamSuggestions,
                generatedAt: new Date(),
                criteria
            };
            // Publish suggestions
            this.publishEvent(eventBus_1.EventTypes.TEAM_SUGGESTIONS_GENERATED, {
                userId,
                suggestions,
                timestamp: new Date()
            });
            this.logInfo(`Generated ${userSuggestions.length} user suggestions and ${teamSuggestions.length} team suggestions for user: ${userId}`);
        }
        catch (error) {
            this.logError(`Failed to generate team suggestions for user: ${userId}`, error);
        }
    }
    async generateUserSuggestions(userProfile, criteria) {
        try {
            // Get potential teammates from database
            let query = `
        SELECT DISTINCT u.user_id, u.username, u.first_name, u.last_name, u.email,
               p.skills, p.interests
        FROM users u
        JOIN profiles p ON u.user_id = p.user_id
        WHERE u.user_id != $1
      `;
            const queryParams = [criteria.userId];
            let paramIndex = 2;
            // Filter by hackathon if specified
            if (criteria.hackathonId) {
                query += ` AND u.user_id NOT IN (
          SELECT tm.user_id FROM team_members tm
          JOIN teams t ON tm.team_id = t.team_id
          WHERE t.hackathon_id = $${paramIndex}
        )`;
                queryParams.push(criteria.hackathonId);
                paramIndex++;
            }
            query += ` ORDER BY u.created_at DESC LIMIT 50`;
            const result = await database_1.pgPool.query(query, queryParams);
            const candidates = result.rows;
            // Calculate compatibility scores
            const suggestions = [];
            for (const candidate of candidates) {
                const candidateProfile = {
                    userId: candidate.user_id,
                    username: candidate.username,
                    firstName: candidate.first_name,
                    lastName: candidate.last_name,
                    skills: candidate.skills || [],
                    interests: candidate.interests || [],
                    experience: [],
                    education: []
                };
                // Get detailed profile from resume if available
                const resume = await models_1.ResumeModel.findOne({ user_id: candidate.user_id });
                if (resume && resume.parsed_resume) {
                    candidateProfile.experience = resume.parsed_resume.experience;
                    candidateProfile.education = resume.parsed_resume.education;
                }
                const matchingScore = this.calculateCompatibilityScore(userProfile, candidateProfile, criteria);
                if (matchingScore > 0.3) { // Minimum threshold
                    suggestions.push({
                        matchingScore,
                        suggestedUsers: [candidateProfile]
                    });
                }
            }
            // Sort by matching score and return top suggestions
            return suggestions
                .sort((a, b) => b.matchingScore - a.matchingScore)
                .slice(0, 10);
        }
        catch (error) {
            this.logError('Failed to generate user suggestions', error);
            return [];
        }
    }
    async generateTeamSuggestions_Internal(userProfile, criteria) {
        try {
            // Get existing teams that need members
            let query = `
        SELECT t.team_id, t.team_name, t.hackathon_id,
               COUNT(tm.user_id) as member_count,
               ARRAY_AGG(DISTINCT unnest(p.skills)) as team_skills,
               ARRAY_AGG(DISTINCT unnest(p.interests)) as team_interests
        FROM teams t
        LEFT JOIN team_members tm ON t.team_id = tm.team_id
        LEFT JOIN profiles p ON tm.user_id = p.user_id
        WHERE t.team_id NOT IN (
          SELECT team_id FROM team_members WHERE user_id = $1
        )
      `;
            const queryParams = [criteria.userId];
            let paramIndex = 2;
            if (criteria.hackathonId) {
                query += ` AND t.hackathon_id = $${paramIndex}`;
                queryParams.push(criteria.hackathonId);
                paramIndex++;
            }
            if (criteria.excludeTeamIds && criteria.excludeTeamIds.length > 0) {
                query += ` AND t.team_id NOT IN (${criteria.excludeTeamIds.map(() => `$${paramIndex++}`).join(',')})`;
                queryParams.push(...criteria.excludeTeamIds);
            }
            query += ` GROUP BY t.team_id, t.team_name, t.hackathon_id
                 HAVING COUNT(tm.user_id) < $${paramIndex}
                 ORDER BY COUNT(tm.user_id) ASC
                 LIMIT 20`;
            queryParams.push(criteria.teamSize || 6);
            const result = await database_1.pgPool.query(query, queryParams);
            const teams = result.rows;
            const suggestions = [];
            for (const team of teams) {
                const teamSkills = team.team_skills ? team.team_skills.filter((s) => s) : [];
                const teamInterests = team.team_interests ? team.team_interests.filter((i) => i) : [];
                const matchingScore = this.calculateTeamCompatibility(userProfile, {
                    skills: teamSkills,
                    interests: teamInterests,
                    memberCount: parseInt(team.member_count)
                });
                if (matchingScore > 0.2) {
                    suggestions.push({
                        teamId: team.team_id,
                        teamName: team.team_name,
                        membersCount: parseInt(team.member_count),
                        matchingScore
                    });
                }
            }
            return suggestions
                .sort((a, b) => b.matchingScore - a.matchingScore)
                .slice(0, 8);
        }
        catch (error) {
            this.logError('Failed to generate team suggestions', error);
            return [];
        }
    }
    calculateCompatibilityScore(user1, user2, criteria) {
        let score = 0;
        let maxScore = 0;
        // Skill complementarity (40% of score)
        const skillScore = this.calculateSkillCompatibility(user1.skills, user2.skills, criteria.requiredSkills);
        score += skillScore * 0.4;
        maxScore += 0.4;
        // Interest alignment (20% of score)
        const interestScore = this.calculateInterestAlignment(user1.interests, user2.interests);
        score += interestScore * 0.2;
        maxScore += 0.2;
        // Experience complementarity (25% of score)
        const experienceScore = this.calculateExperienceCompatibility(user1.experience, user2.experience);
        score += experienceScore * 0.25;
        maxScore += 0.25;
        // Diversity bonus (15% of score)
        const diversityScore = this.calculateDiversityBonus(user1, user2);
        score += diversityScore * 0.15;
        maxScore += 0.15;
        return maxScore > 0 ? score / maxScore : 0;
    }
    calculateSkillCompatibility(skills1, skills2, requiredSkills) {
        const normalizedSkills1 = this.normalizeSkills(skills1);
        const normalizedSkills2 = this.normalizeSkills(skills2);
        let score = 0;
        let maxScore = 0;
        // Check for complementary skills (different but valuable skills)
        const uniqueSkills1 = normalizedSkills1.filter(skill => !normalizedSkills2.includes(skill));
        const uniqueSkills2 = normalizedSkills2.filter(skill => !normalizedSkills1.includes(skill));
        // Bonus for complementary skills
        uniqueSkills1.forEach(skill => {
            const weight = this.skillWeights.get(skill) || 3;
            score += weight * 0.1;
            maxScore += 10 * 0.1;
        });
        uniqueSkills2.forEach(skill => {
            const weight = this.skillWeights.get(skill) || 3;
            score += weight * 0.1;
            maxScore += 10 * 0.1;
        });
        // Check coverage of required skills
        if (requiredSkills && requiredSkills.length > 0) {
            const normalizedRequired = this.normalizeSkills(requiredSkills);
            const combinedSkills = [...normalizedSkills1, ...normalizedSkills2];
            normalizedRequired.forEach(requiredSkill => {
                if (combinedSkills.includes(requiredSkill)) {
                    score += 15; // High bonus for covering required skills
                }
                maxScore += 15;
            });
        }
        // Small bonus for some overlapping skills (shows common ground)
        const overlappingSkills = normalizedSkills1.filter(skill => normalizedSkills2.includes(skill));
        if (overlappingSkills.length > 0 && overlappingSkills.length <= 3) {
            score += overlappingSkills.length * 2;
            maxScore += 6;
        }
        return maxScore > 0 ? Math.min(score / maxScore, 1) : 0;
    }
    calculateInterestAlignment(interests1, interests2) {
        if (!interests1.length || !interests2.length)
            return 0.5; // Neutral if no interests
        const normalizedInterests1 = interests1.map(i => i.toLowerCase().trim());
        const normalizedInterests2 = interests2.map(i => i.toLowerCase().trim());
        const commonInterests = normalizedInterests1.filter(interest => normalizedInterests2.includes(interest));
        const totalInterests = new Set([...normalizedInterests1, ...normalizedInterests2]).size;
        if (totalInterests === 0)
            return 0.5;
        // Jaccard similarity with bonus for multiple common interests
        const jaccardSimilarity = commonInterests.length / totalInterests;
        const commonInterestBonus = Math.min(commonInterests.length * 0.1, 0.3);
        return Math.min(jaccardSimilarity + commonInterestBonus, 1);
    }
    calculateExperienceCompatibility(exp1, exp2) {
        if (!exp1.length || !exp2.length)
            return 0.5; // Neutral if no experience data
        // Check for complementary experience levels and domains
        const domains1 = exp1.map(e => this.extractDomain(e.title || e.company || ''));
        const domains2 = exp2.map(e => this.extractDomain(e.title || e.company || ''));
        const uniqueDomains = new Set([...domains1, ...domains2]).size;
        const totalDomains = domains1.length + domains2.length;
        // Higher diversity in experience domains is better
        return totalDomains > 0 ? uniqueDomains / totalDomains : 0.5;
    }
    calculateDiversityBonus(user1, user2) {
        let diversityScore = 0;
        // Different educational backgrounds
        if (user1.education && user2.education) {
            const edu1 = user1.education.map(e => e.degree?.toLowerCase() || '');
            const edu2 = user2.education.map(e => e.degree?.toLowerCase() || '');
            const hasCommonEducation = edu1.some(e1 => edu2.some(e2 => e1.includes(e2) || e2.includes(e1)));
            if (!hasCommonEducation && edu1.length > 0 && edu2.length > 0) {
                diversityScore += 0.3; // Bonus for diverse educational backgrounds
            }
        }
        // Different skill categories
        const skillCategories1 = this.categorizeSkills(user1.skills);
        const skillCategories2 = this.categorizeSkills(user2.skills);
        const totalCategories = new Set([...skillCategories1, ...skillCategories2]).size;
        const maxCategories = Math.max(skillCategories1.length, skillCategories2.length);
        if (maxCategories > 0) {
            diversityScore += (totalCategories / maxCategories) * 0.7;
        }
        return Math.min(diversityScore, 1);
    }
    calculateTeamCompatibility(userProfile, teamData) {
        const userSkills = this.normalizeSkills(userProfile.skills);
        const teamSkills = this.normalizeSkills(teamData.skills);
        // Check what unique skills the user brings
        const uniqueUserSkills = userSkills.filter(skill => !teamSkills.includes(skill));
        const skillContribution = uniqueUserSkills.reduce((sum, skill) => {
            return sum + (this.skillWeights.get(skill) || 3);
        }, 0);
        // Interest alignment with team
        const interestAlignment = this.calculateInterestAlignment(userProfile.interests, teamData.interests);
        // Team size factor (prefer teams that aren't too full)
        const teamSizeFactor = Math.max(0, (6 - teamData.memberCount) / 6);
        return (skillContribution * 0.1 + interestAlignment * 0.4 + teamSizeFactor * 0.5) / 3;
    }
    normalizeSkills(skills) {
        const normalized = [];
        skills.forEach(skill => {
            const trimmedSkill = skill.trim();
            // Check if this skill is a synonym of a main skill
            let mainSkill = trimmedSkill;
            for (const [main, synonyms] of this.skillSynonyms.entries()) {
                if (synonyms.some(syn => syn.toLowerCase() === trimmedSkill.toLowerCase())) {
                    mainSkill = main;
                    break;
                }
            }
            normalized.push(mainSkill);
        });
        return [...new Set(normalized)]; // Remove duplicates
    }
    categorizeSkills(skills) {
        const categories = [];
        const categoryMap = {
            'Frontend': ['React', 'Angular', 'Vue.js', 'HTML', 'CSS', 'JavaScript', 'TypeScript'],
            'Backend': ['Node.js', 'Python', 'Java', 'C#', 'Go', 'PHP', 'Ruby'],
            'Database': ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'SQL'],
            'Cloud': ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes'],
            'Mobile': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Xamarin'],
            'Data': ['Machine Learning', 'Data Science', 'Python', 'R', 'TensorFlow'],
            'Design': ['UI/UX', 'Figma', 'Photoshop', 'Sketch']
        };
        Object.entries(categoryMap).forEach(([category, categorySkills]) => {
            if (skills.some(skill => categorySkills.includes(skill))) {
                categories.push(category);
            }
        });
        return categories;
    }
    extractDomain(text) {
        const domains = ['fintech', 'healthcare', 'education', 'ecommerce', 'gaming', 'social', 'enterprise', 'startup'];
        const lowerText = text.toLowerCase();
        for (const domain of domains) {
            if (lowerText.includes(domain)) {
                return domain;
            }
        }
        return 'general';
    }
    async getUserProfile(userId) {
        try {
            // Get basic user info from PostgreSQL
            const userResult = await database_1.pgPool.query(`SELECT u.user_id, u.username, u.first_name, u.last_name, u.email,
                p.skills, p.interests
         FROM users u
         LEFT JOIN profiles p ON u.user_id = p.user_id
         WHERE u.user_id = $1`, [userId]);
            if (userResult.rows.length === 0) {
                return null;
            }
            const user = userResult.rows[0];
            const profile = {
                userId: user.user_id,
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name,
                skills: user.skills || [],
                interests: user.interests || [],
                experience: [],
                education: []
            };
            // Get detailed resume info from MongoDB
            const resume = await models_1.ResumeModel.findOne({ user_id: userId });
            if (resume && resume.parsed_resume) {
                profile.experience = resume.parsed_resume.experience || [];
                profile.education = resume.parsed_resume.education || [];
                // Use resume skills if more comprehensive
                if (resume.parsed_resume.skills && resume.parsed_resume.skills.length > profile.skills.length) {
                    profile.skills = resume.parsed_resume.skills;
                }
            }
            return profile;
        }
        catch (error) {
            this.logError(`Failed to get user profile for ${userId}`, error);
            return null;
        }
    }
    async updateUserSkillProfile(event) {
        const { userId, parsedResume } = event.payload;
        try {
            // Update user's skills in PostgreSQL profile
            if (parsedResume.skills && parsedResume.skills.length > 0) {
                await database_1.pgPool.query('UPDATE profiles SET skills = $1, updated_at = $2 WHERE user_id = $3', [parsedResume.skills, new Date(), userId]);
                this.logInfo(`Updated skill profile for user: ${userId} with ${parsedResume.skills.length} skills`);
            }
        }
        catch (error) {
            this.logError(`Failed to update skill profile for user: ${userId}`, error);
        }
    }
    onStart() {
        this.logInfo('Skill Matching Agent started - Ready to generate team suggestions');
    }
    onStop() {
        this.logInfo('Skill Matching Agent stopped');
    }
}
exports.SkillMatchingAgent = SkillMatchingAgent;
exports.default = SkillMatchingAgent;
//# sourceMappingURL=SkillMatchingAgent.js.map