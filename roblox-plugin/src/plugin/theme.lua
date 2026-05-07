local Theme = {}

Theme.Colors = {
	Background = Color3.fromRGB(18, 19, 22),
	Surface = Color3.fromRGB(31, 34, 39),
	SurfaceAlt = Color3.fromRGB(39, 43, 49),
	SurfaceHover = Color3.fromRGB(50, 55, 63),
	Glass = Color3.fromRGB(31, 34, 39),
	GlassSoft = Color3.fromRGB(25, 28, 33),
	Border = Color3.fromRGB(83, 91, 104),
	Text = Color3.fromRGB(245, 247, 250),
	TextMuted = Color3.fromRGB(181, 189, 201),
	TextSubtle = Color3.fromRGB(139, 149, 163),
	AccentYellow = Color3.fromRGB(242, 176, 48),
	AccentBlue = Color3.fromRGB(69, 148, 229),
	AccentPink = Color3.fromRGB(213, 105, 196),
	Error = Color3.fromRGB(231, 82, 82),
	Success = Color3.fromRGB(63, 184, 126),
	Warning = Color3.fromRGB(235, 159, 53),
}

Theme.Font = {
	Default = Enum.Font.GothamMedium,
	Bold = Enum.Font.GothamBold,
	Mono = Enum.Font.RobotoMono,
}

Theme.Size = {
	TextTiny = 11,
	TextSmall = 12,
	TextNormal = 14,
	TextLarge = 18,
	Padding = 10,
	PaddingSmall = 6,
	BorderRadius = 8,
	RowHeight = 34,
	IconSize = 16,
}

return Theme
