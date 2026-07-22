import { PRELAUNCH_CONTRACTS, PRELAUNCH_PROVIDERS, contractCapabilities } from "../contracts/prelaunchContractCatalog.js";

const authorityNames={workflow:"Workflow Authority",identity:"Identity Authority",conversation:"Conversation Authority",memory:"Memory Governance Authority",research:"Research Authority",mission:"Mission Control Authority",creator:"Creator Authority",finance:"Finance Authority",content:"Creator Studio Authority",subscription:"Subscription Authority",platform:"Platform Operations Authority"};
const authorityIds=["workflow",...new Set(PRELAUNCH_CONTRACTS.map(({authority})=>authority))];
const capabilities=[{id:"workflow.execute",name:"Workflow Execution",version:"1.0.0",description:"Execute registered workflows",scope:"kernel",authority:"workflow",action:"run",permissions:[],status:"active"},...contractCapabilities()];

const defaultManifest={
 metadata:{name:"AstraMind OS",vendor:"AstraMind Technologies",organization:"AstraMind Technologies",osVersion:"3.0.0-beta.1",kernelVersion:"3.0.0-beta.1",manifestVersion:"1.1.0",buildNumber:"prelaunch",buildDate:"runtime",environment:process.env.NODE_ENV||"development",edition:"prelaunch",license:"proprietary"},
 kernel:{bootMode:"normal",policyMode:"enforced",scheduler:true,missionEngine:true,registry:true,clock:true,eventBus:true,diagnostics:true,health:true,stateManager:true,authorityManager:true,providerManager:true},
 boot:{bootSequence:["services","authorities"],requiredServices:[],requiredProviders:[],requiredAuthorities:authorityIds,startupTimeout:10000,shutdownTimeout:10000,safeMode:false,recoveryMode:false},
 security:{securityProfile:"prelaunch",encryption:false,zeroTrust:false,auditLogging:true,capabilityValidation:true,providerIsolation:true,authorityIsolation:true,memoryProtection:true,missionValidation:true},
 capabilities,
 providers:PRELAUNCH_PROVIDERS.map((provider)=>({id:provider.id,type:"external",version:"1.0.0",status:"declared",supportedCapabilities:[...new Set(PRELAUNCH_CONTRACTS.filter((contract)=>contract.providers.includes(provider.id)).map((contract)=>contract.capability))]})),
 authorities:authorityIds.map((id)=>({id,name:authorityNames[id]||`${id} Authority`,version:"1.0.0",entryPoint:id==="workflow"?"builtin":"builtin-contract",dependencies:id==="workflow"?[]:["workflow"],requiredCapabilities:capabilities.filter(({authority})=>authority===id).map(({id:capabilityId})=>capabilityId),requiredProviders:[],status:"active"})),
 services:[...new Set(PRELAUNCH_CONTRACTS.filter(({api})=>api).map(({api})=>api.split("/").slice(0,3).join("/")))].map((id)=>({id:id.replace(/\//g,".").replace(/^\./,""),name:id,version:"1.0.0",status:"active"})),
 plugins:[],featureFlags:{prelaunchReadiness:true},diagnostics:{healthChecks:true,metrics:true,telemetry:false,logging:true,crashReporting:false,performanceSampling:true},
 compatibility:{minimumKernelVersion:"3.0.0-alpha.1",minimumManifestVersion:"1.0.0",supportedAuthorities:authorityIds,supportedProviders:PRELAUNCH_PROVIDERS.map(({id})=>id),deprecatedComponents:[],migrationRules:[]},extensions:{contractCatalogVersion:"1.0.0"}
};
export default defaultManifest;

