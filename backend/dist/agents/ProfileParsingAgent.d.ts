import Agent from './base/Agent';
import { Event } from '../shared/types';
export declare class ProfileParsingAgent extends Agent {
    constructor();
    protected processEvent(event: Event): Promise<void>;
    private parseResume;
    private performIntelligentParsing;
    private extractSkills;
    private extractExperience;
    private extractEducation;
    private capitalizeSkill;
    private cleanText;
    private extractYears;
    private extractYear;
    private storeParsedResume;
    protected onStart(): void;
    protected onStop(): void;
}
export default ProfileParsingAgent;
//# sourceMappingURL=ProfileParsingAgent.d.ts.map