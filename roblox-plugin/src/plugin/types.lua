export type SelectionState = "selected" | "partial" | "none"

export type InstanceData = {
	uuid: string,
	className: string,
	name: string,
	properties: { [string]: any },
	attributes: { [string]: any },
	tags: { string },
	children: { string },
}

export type ScriptData = {
	uuid: string,
	name: string,
	scriptType: string,
	source: string,
	className: string,
}

export type CacheKey = {
	gameId: string,
	placeId: string,
}

export type BridgePayload = {
	requestId: string,
	action: string,
	payload: any,
	timestamp: number,
}

export type BridgeResponse = {
	requestId: string,
	success: boolean,
	payload: any?,
	error: { code: string, message: string }?,
	timestamp: number,
}

export type DiagnosticEntry = {
	code: string,
	severity: string,
	message: string,
	source: string,
}

local Types = {}
return Types
