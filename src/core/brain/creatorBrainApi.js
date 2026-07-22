import { apiFetch } from "../../services/apiClient.js";

const json=(method,body)=>({method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
export const getCreatorProfile=()=>apiFetch("/api/creator-brain/profile");
export const updateCreatorProfile=(payload)=>apiFetch("/api/creator-brain/profile",json("PATCH",payload));
export const getCreatorProjects=()=>apiFetch("/api/creator-brain/projects");
export const createCreatorProject=(payload)=>apiFetch("/api/creator-brain/projects",json("POST",payload));
export const updateCreatorProject=(id,payload)=>apiFetch(`/api/creator-brain/projects/${id}`,json("PATCH",payload));
export const deleteCreatorProject=(id)=>apiFetch(`/api/creator-brain/projects/${id}`,{method:"DELETE"});
export const getCreatorMemory=(params={})=>{const query=new URLSearchParams(params);return apiFetch(`/api/creator-brain/memory${query.toString()?`?${query}`:""}`);};
export const createCreatorMemory=(payload)=>apiFetch("/api/creator-brain/memory",json("POST",payload));
export const updateCreatorMemory=(id,payload)=>apiFetch(`/api/creator-brain/memory/${id}`,json("PATCH",payload));
export const deleteCreatorMemory=(id)=>apiFetch(`/api/creator-brain/memory/${id}`,{method:"DELETE"});
export const getCreatorDashboard=()=>apiFetch("/api/creator-brain/dashboard");
