import { apiRequest } from "../api/client";
export type AnalyticsEventName="HOME_VIEWED"|"EXPLORE_VIEWED"|"RECOMMENDATION_VIEWED"|"SERVICE_PROFILE_VIEWED"|"SERVICE_COMPARE_VIEWED"|"PERMISSION_CHECKOUT_VIEWED"|"MY_AGENTS_VIEWED"|"AGENT_ADVANTAGE_VIEWED";
export type FeedbackContext="SMART_MONEY_CHECK"|"AGENT_MATCH"|"AGENT_PROFILE"|"PERMISSION_CHECKOUT"|"ACTIVATION"|"AGENT_ADVANTAGE"|"SWITCH"|"REVOKE"|"OPERATOR_WORKSPACE";
function sessionId(){const key="spotriq:analytics-session:v1";try{const existing=localStorage.getItem(key);if(existing)return existing;const created=crypto.randomUUID();localStorage.setItem(key,created);return created;}catch{return `ephemeral-${crypto.randomUUID()}`;}}
async function post(path:string,body:Record<string,unknown>){return apiRequest(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,sessionId:sessionId()})});}
export const adoptionAnalyticsRepository={
  event:(eventName:AnalyticsEventName,details:Record<string,unknown>={})=>post("/v1/analytics/events",{eventName,...details}),
  feedback:(context:FeedbackContext,details:Record<string,unknown>={})=>post("/v1/analytics/feedback",{context,...details}),
  report:(token:string,query="")=>apiRequest(`/v1/admin/adoption-analytics${query}`,{headers:{authorization:`Bearer ${token}`}}),
};
