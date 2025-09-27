import Agent from './base/Agent';
import { Event } from '../shared/types';
export declare class SkillMatchingAgent extends Agent {
    private skillWeights;
    private skillSynonyms;
    constructor();
    private initializeSkillData;
    protected processEvent(event: Event): Promise<void>;
    private generateTeamSuggestions;
    private generateUserSuggestions;
    private generateTeamSuggestions_Internal;
    private calculateCompatibilityScore;
    private calculateSkillCompatibility;
    private calculateInterestAlignment;
    private calculateExperienceCompatibility;
    private calculateDiversityBonus;
    private calculateTeamCompatibility;
    private normalizeSkills;
    private categorizeSkills;
    private extractDomain;
    private getUserProfile;
    private updateUserSkillProfile;
    protected onStart(): void;
    protected onStop(): void;
}
export default SkillMatchingAgent;
//# sourceMappingURL=SkillMatchingAgent.d.ts.map