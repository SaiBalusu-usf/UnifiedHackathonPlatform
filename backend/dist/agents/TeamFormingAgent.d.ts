import Agent from './base/Agent';
import { Event } from '../shared/types';
export declare class TeamFormingAgent extends Agent {
    private readonly MAX_TEAM_SIZE;
    private readonly MIN_TEAM_SIZE;
    private readonly SKILL_COVERAGE_WEIGHT;
    private readonly DIVERSITY_WEIGHT;
    private readonly COMPATIBILITY_WEIGHT;
    constructor();
    protected processEvent(event: Event): Promise<void>;
    private handleTeamFormationRequest;
    private getAvailableCandidates;
    private findOptimalTeamComposition;
    private geneticAlgorithmOptimization;
    private generateInitialPopulation;
    private crossover;
    private mutate;
    private evaluateTeamComposition;
    private calculateSkillCoverage;
    private calculateDiversityScore;
    private calculateCompatibilityScore;
    private createTeam;
    private addMembersToTeam;
    private sendTeamInvitations;
    private suggestManualTeamFormation;
    private checkExistingTeamMembership;
    private getRequesterProfile;
    private evaluateTeamSuggestions;
    protected onStart(): void;
    protected onStop(): void;
}
export default TeamFormingAgent;
//# sourceMappingURL=TeamFormingAgent.d.ts.map