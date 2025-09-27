"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = void 0;
// Event types for the hackathon platform
var EventType;
(function (EventType) {
    // User events
    EventType["USER_REGISTERED"] = "user_registered";
    EventType["USER_LOGIN"] = "user_login";
    EventType["USER_LOGOUT"] = "user_logout";
    EventType["USER_PROFILE_UPDATED"] = "user_profile_updated";
    EventType["USER_LOCATION_UPDATED"] = "user_location_updated";
    EventType["USER_STATUS_CHANGED"] = "user_status_changed";
    // Team events
    EventType["TEAM_CREATED"] = "team_created";
    EventType["TEAM_UPDATED"] = "team_updated";
    EventType["TEAM_DELETED"] = "team_deleted";
    EventType["TEAM_MEMBER_ADDED"] = "team_member_added";
    EventType["TEAM_MEMBER_REMOVED"] = "team_member_removed";
    EventType["TEAM_MEMBER_ROLE_CHANGED"] = "team_member_role_changed";
    EventType["TEAM_INVITATION_SENT"] = "team_invitation_sent";
    EventType["TEAM_INVITATION_ACCEPTED"] = "team_invitation_accepted";
    EventType["TEAM_INVITATION_DECLINED"] = "team_invitation_declined";
    // Hackathon events
    EventType["HACKATHON_CREATED"] = "hackathon_created";
    EventType["HACKATHON_UPDATED"] = "hackathon_updated";
    EventType["HACKATHON_STARTED"] = "hackathon_started";
    EventType["HACKATHON_ENDED"] = "hackathon_ended";
    EventType["HACKATHON_REGISTRATION_OPENED"] = "hackathon_registration_opened";
    EventType["HACKATHON_REGISTRATION_CLOSED"] = "hackathon_registration_closed";
    EventType["USER_REGISTERED_FOR_HACKATHON"] = "user_registered_for_hackathon";
    EventType["USER_UNREGISTERED_FROM_HACKATHON"] = "user_unregistered_from_hackathon";
    // Resume and AI events
    EventType["RESUME_UPLOADED"] = "resume_uploaded";
    EventType["RESUME_PARSED"] = "resume_parsed";
    EventType["RESUME_PARSING_FAILED"] = "resume_parsing_failed";
    EventType["RESUME_ANALYSIS_COMPLETED"] = "resume_analysis_completed";
    EventType["SKILL_MATCH_FOUND"] = "skill_match_found";
    EventType["TEAM_SUGGESTION_GENERATED"] = "team_suggestion_generated";
    EventType["TEAM_SUGGESTION_REQUESTED"] = "team_suggestion_requested";
    EventType["TEAM_SUGGESTIONS_GENERATED"] = "team_suggestions_generated";
    // Agent events
    EventType["AGENT_STARTED"] = "agent_started";
    EventType["AGENT_STOPPED"] = "agent_stopped";
    EventType["AGENT_ERROR"] = "agent_error";
    EventType["AGENT_TASK_STARTED"] = "agent_task_started";
    EventType["AGENT_TASK_COMPLETED"] = "agent_task_completed";
    EventType["AGENT_TASK_FAILED"] = "agent_task_failed";
    EventType["AGENT_HEALTH_CHECK"] = "agent_health_check";
    // Tracking events
    EventType["SESSION_STARTED"] = "session_started";
    EventType["SESSION_PAUSED"] = "session_paused";
    EventType["SESSION_RESUMED"] = "session_resumed";
    EventType["SESSION_ENDED"] = "session_ended";
    EventType["LOCATION_SHARED"] = "location_shared";
    EventType["LOCATION_STOPPED"] = "location_stopped";
    EventType["CHECK_IN"] = "check_in";
    EventType["CHECK_OUT"] = "check_out";
    // Communication events
    EventType["MESSAGE_SENT"] = "message_sent";
    EventType["MESSAGE_RECEIVED"] = "message_received";
    EventType["NOTIFICATION_SENT"] = "notification_sent";
    EventType["TYPING_STARTED"] = "typing_started";
    EventType["TYPING_STOPPED"] = "typing_stopped";
    // System events
    EventType["SYSTEM_MAINTENANCE_START"] = "system_maintenance_start";
    EventType["SYSTEM_MAINTENANCE_END"] = "system_maintenance_end";
    EventType["SYSTEM_ERROR"] = "system_error";
    EventType["SYSTEM_HEALTH_CHECK"] = "system_health_check";
})(EventType || (exports.EventType = EventType = {}));
//# sourceMappingURL=eventTypes.js.map