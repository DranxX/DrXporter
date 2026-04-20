local Theme = {}

Theme.Colors = {
	Background = Color3.fromRGB(24, 24, 27),
	Surface = Color3.fromRGB(32, 32, 36),
	SurfaceHover = Color3.fromRGB(42, 42, 48),
	Border = Color3.fromRGB(55, 55, 62),
	Text = Color3.fromRGB(228, 228, 231),
	TextMuted = Color3.fromRGB(140, 140, 150),
	AccentYellow = Color3.fromRGB(250, 204, 21),
	AccentBlue = Color3.fromRGB(56, 189, 248),
	Error = Color3.fromRGB(239, 68, 68),
	Success = Color3.fromRGB(34, 197, 94),
	Warning = Color3.fromRGB(234, 179, 8),
}

Theme.Font = {
	Default = Enum.Font.GothamMedium,
	Bold = Enum.Font.GothamBold,
	Mono = Enum.Font.RobotoMono,
}

Theme.Size = {
	TextSmall = 11,
	TextNormal = 13,
	TextLarge = 15,
	Padding = 8,
	PaddingSmall = 4,
	BorderRadius = 6,
	RowHeight = 28,
	IconSize = 16,
}

return Theme
