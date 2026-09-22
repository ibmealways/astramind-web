export const SCENE_METHODS = Object.freeze({
  CAMERA_MOTION: "image-camera-motion",
  LAYERED_MOTION: "image-layered-motion",
  CHARACTER_RIG: "character-rig",
  LOCAL_VIDEO: "local-video-model",
  COMMERCIAL_VIDEO: "commercial-video-provider",
});

const COMPLEX_ACTION = /fight|battle|chase|run|jump|transformation|explosion|crowd|dance|vehicle|complex action/i;
const DIALOGUE = /dialogue|speaks?|says?|talks?|conversation|lip.?sync|close.?up/i;
const ENVIRONMENT = /rain|snow|smoke|fog|fire|embers|particles|wind|water|glow|lightning|magic/i;
const CAMERA_ONLY = /establishing|landscape|cityscape|exterior|interior|slow reveal|still moment|portrait/i;

function text(scene = {}) {
  return [scene.title, scene.visual, scene.caption, scene.voiceover, scene.imagePrompt].filter(Boolean).join(" ");
}

export function classifySceneCapabilities(scene = {}) {
  const value = text(scene);
  const duration = Math.max(1, Number(scene.duration || 5));
  return {
    dialogue: DIALOGUE.test(value),
    environmentalMotion: ENVIRONMENT.test(value),
    complexAction: COMPLEX_ACTION.test(value),
    cameraLed: CAMERA_ONLY.test(value),
    hasCharacterReference: Boolean(scene.characterReference || scene.characterId || scene.cast?.length),
    duration,
  };
}

export function routeSceneProduction(scene = {}, context = {}) {
  const capabilities = classifySceneCapabilities(scene);
  const policy = context.policy || "balanced";
  const localVideoAvailable = context.localVideoAvailable === true;
  const commercialVideoAvailable = context.commercialVideoAvailable === true;
  const characterRigAvailable = context.characterRigAvailable === true;
  let method = SCENE_METHODS.CAMERA_MOTION;
  let reason = "A generated image with camera movement is sufficient for this shot.";
  let relativeCost = 1;

  if (capabilities.dialogue && characterRigAvailable && capabilities.hasCharacterReference) {
    method = SCENE_METHODS.CHARACTER_RIG;
    reason = "Dialogue is best handled by a reusable character rig with facial animation and lip-sync.";
    relativeCost = 2;
  } else if (capabilities.complexAction && localVideoAvailable) {
    method = SCENE_METHODS.LOCAL_VIDEO;
    reason = "The shot requires newly generated body or camera motion and local video compute is available.";
    relativeCost = 4;
  } else if (commercialVideoAvailable && policy === "maximum-quality") {
    method = SCENE_METHODS.COMMERCIAL_VIDEO;
    reason = "The maximum-quality policy permits provider-generated motion for this shot.";
    relativeCost = 10;
  } else if (capabilities.environmentalMotion || capabilities.dialogue) {
    method = SCENE_METHODS.LAYERED_MOTION;
    reason = "Layered subject, environment, and effect motion can satisfy this shot without full video generation.";
    relativeCost = 2;
  }

  return {
    sceneId: scene.id || scene.sceneId || null,
    method,
    reason,
    relativeCost,
    estimatedComputeClass: relativeCost >= 10 ? "hosted-gpu" : relativeCost >= 4 ? "local-gpu" : "composer",
    capabilities,
    fallbackMethod: SCENE_METHODS.CAMERA_MOTION,
  };
}

export function buildProductionRoutingPlan({ scenes = [], context = {} } = {}) {
  const routes = scenes.map((scene) => routeSceneProduction(scene, context));
  return {
    policy: context.policy || "balanced",
    sceneCount: routes.length,
    totalRelativeCost: routes.reduce((sum, route) => sum + route.relativeCost, 0),
    methods: routes.reduce((counts, route) => ({ ...counts, [route.method]: (counts[route.method] || 0) + 1 }), {}),
    routes,
  };
}

export default { SCENE_METHODS, classifySceneCapabilities, routeSceneProduction, buildProductionRoutingPlan };
