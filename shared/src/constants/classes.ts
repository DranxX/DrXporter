export const SCRIPT_CLASS_NAMES = ["Script", "LocalScript", "ModuleScript"] as const;

export const CONTAINER_CLASS_NAMES = [
  "Folder",
  "Model",
  "Configuration",
  "ScreenGui",
  "SurfaceGui",
  "BillboardGui",
] as const;

export const SERVICE_CLASS_NAMES = [
  "Workspace",
  "ReplicatedStorage",
  "ReplicatedFirst",
  "ServerScriptService",
  "ServerStorage",
  "StarterGui",
  "StarterPack",
  "StarterPlayer",
  "Lighting",
  "SoundService",
  "Chat",
  "Teams",
  "TestService",
] as const;

export const EXPORTABLE_CLASS_NAMES = [
  ...SCRIPT_CLASS_NAMES,
  ...CONTAINER_CLASS_NAMES,
  "Part",
  "MeshPart",
  "UnionOperation",
  "SpawnLocation",
  "Seat",
  "VehicleSeat",
  "TrussPart",
  "WedgePart",
  "CornerWedgePart",
  "Decal",
  "Texture",
  "PointLight",
  "SpotLight",
  "SurfaceLight",
  "Fire",
  "Smoke",
  "Sparkles",
  "ParticleEmitter",
  "Beam",
  "Trail",
  "Sound",
  "Animation",
  "Animator",
  "Humanoid",
  "HumanoidDescription",
  "Tool",
  "RemoteEvent",
  "RemoteFunction",
  "BindableEvent",
  "BindableFunction",
  "BoolValue",
  "IntValue",
  "NumberValue",
  "StringValue",
  "ObjectValue",
  "CFrameValue",
  "Color3Value",
  "Vector3Value",
  "RayValue",
  "BrickColorValue",
  "Attachment",
  "WeldConstraint",
  "RigidConstraint",
  "RopeConstraint",
  "SpringConstraint",
  "HingeConstraint",
  "PrismaticConstraint",
  "CylindricalConstraint",
  "BallSocketConstraint",
  "AlignOrientation",
  "AlignPosition",
  "BodyGyro",
  "BodyPosition",
  "BodyVelocity",
  "BodyForce",
  "ProximityPrompt",
  "ClickDetector",
  "Camera",
  "UIListLayout",
  "UIGridLayout",
  "UITableLayout",
  "UIPageLayout",
  "UIPadding",
  "UICorner",
  "UIStroke",
  "UIGradient",
  "UIScale",
  "UISizeConstraint",
  "UITextSizeConstraint",
  "UIAspectRatioConstraint",
  "Frame",
  "TextLabel",
  "TextButton",
  "TextBox",
  "ImageLabel",
  "ImageButton",
  "ScrollingFrame",
  "ViewportFrame",
  "VideoFrame",
  "CanvasGroup",
] as const;

export type ScriptClassName = (typeof SCRIPT_CLASS_NAMES)[number];
export type ServiceClassName = (typeof SERVICE_CLASS_NAMES)[number];
export type ExportableClassName = (typeof EXPORTABLE_CLASS_NAMES)[number];

export function isScriptClass(className: string): className is ScriptClassName {
  return (SCRIPT_CLASS_NAMES as readonly string[]).includes(className);
}

export function isServiceClass(className: string): className is ServiceClassName {
  return (SERVICE_CLASS_NAMES as readonly string[]).includes(className);
}

export function isFolderClass(className: string): className is "Folder" {
  return className === "Folder";
}

export function isExportableClass(className: string): className is ExportableClassName {
  return (EXPORTABLE_CLASS_NAMES as readonly string[]).includes(className);
}
