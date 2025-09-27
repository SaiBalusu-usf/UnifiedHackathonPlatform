export interface User {
    user_id: string;
    username: string;
    email: string;
    password_hash?: string;
    first_name: string;
    last_name: string;
    role: 'participant' | 'organizer' | 'admin';
    created_at: Date;
    updated_at: Date;
}
export interface Profile {
    profile_id: string;
    user_id: string;
    skills: string[];
    interests: string[];
    resume_url?: string;
    github_url?: string;
    linkedin_url?: string;
    portfolio_url?: string;
    created_at: Date;
    updated_at: Date;
}
export interface Team {
    team_id: string;
    team_name: string;
    hackathon_id: string;
    created_by: string;
    created_at: Date;
    updated_at: Date;
    members?: TeamMember[];
}
export interface TeamMember {
    team_member_id: string;
    team_id: string;
    user_id: string;
    role: 'leader' | 'member';
    joined_at: Date;
}
export interface Hackathon {
    hackathon_id: string;
    name: string;
    description: string;
    start_date: Date;
    end_date: Date;
    created_by: string;
    created_at: Date;
    updated_at: Date;
}
export interface Submission {
    submission_id: string;
    team_id: string;
    hackathon_id: string;
    project_name: string;
    project_description: string;
    source_code_url?: string;
    demo_url?: string;
    submitted_at: Date;
}
export interface ParsedResume {
    skills: string[];
    experience: Experience[];
    education: Education[];
}
export interface Experience {
    title: string;
    company: string;
    years: string;
    description?: string;
}
export interface Education {
    degree: string;
    institution: string;
    year: number;
    gpa?: number;
}
export interface Resume {
    _id?: string;
    user_id: string;
    original_resume?: string;
    parsed_resume: ParsedResume;
    created_at: Date;
    updated_at: Date;
}
export interface TrackingLog {
    _id?: string;
    user_id: string;
    hackathon_id: string;
    session_id: string;
    location: {
        type: 'Point';
        coordinates: [number, number];
    };
    timestamp: Date;
}
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface TeamSuggestion {
    teamId?: string;
    teamName?: string;
    membersCount?: number;
    matchingScore: number;
    suggestedUsers?: User[];
}
export interface Event {
    type: string;
    payload: any;
    timestamp: Date;
    source: string;
}
export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}
//# sourceMappingURL=index.d.ts.map