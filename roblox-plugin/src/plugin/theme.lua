local Theme = {}

Theme.Colors = {
	Background = Color3.fromRGB(10, 14, 22),
	Surface = Color3.fromRGB(26, 34, 48),
	SurfaceHover = Color3.fromRGB(38, 50, 70),
	Glass = Color3.fromRGB(30, 40, 58),
	GlassSoft = Color3.fromRGB(18, 24, 36),
	Border = Color3.fromRGB(105, 130, 165),
	Text = Color3.fromRGB(238, 246, 255),
	TextMuted = Color3.fromRGB(155, 172, 196),
	AccentYellow = Color3.fromRGB(255, 210, 92),
	AccentBlue = Color3.fromRGB(93, 214, 255),
	AccentPink = Color3.fromRGB(255, 122, 198),
	Error = Color3.fromRGB(255, 90, 112),
	Success = Color3.fromRGB(79, 224, 163),
	Warning = Color3.fromRGB(255, 190, 84),
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
	BorderRadius = 10,
	RowHeight = 28,
	IconSize = 16,
}

return Theme
