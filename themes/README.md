# 🎨 Themes

Customizable theme library for LavaPanel. Create and share beautiful lava-inspired themes.

## Default Theme: Lava

The default theme features a warm, energetic color palette inspired by flowing lava:

- **Primary**: #ff6b35 (Lava Orange)
- **Secondary**: #ff8c5a (Glow Orange)
- **Background**: #1a0a0a (Dark Volcanic)
- **Accent**: #ff9f6b (Soft Lava)

## Creating Custom Themes

Create a JSON file in this directory with your theme configuration:

```json
{
  "name": "my-theme",
  "author": "YourName",
  "config": {
    "primary": "#ff6b35",
    "secondary": "#ff8c5a",
    "background": "#1a0a0a",
    "text": "#ffffff",
    "border": "#ff6b35",
    "glow": "rgba(255, 107, 53, 0.3)"
  }
}
```

## Theme Variables

| Variable | Description | Default |
|----------|-------------|---------|
| primary | Main brand color | #ff6b35 |
| secondary | Accent/hover color | #ff8c5a |
| background | Page background | #1a0a0a |
| text | Text color | #ffffff |
| border | Border color | #ff6b35 |
| glow | Shadow/glow effect | rgba(255, 107, 53, 0.3) |

## Submitting Themes

To contribute your theme to the community library:

1. Create your theme JSON file
2. Test it in the panel
3. Submit a pull request with your theme file
4. Include a screenshot in the PR description

## Activating Themes

Themes can be activated via:
- **Panel UI**: Settings → Themes
- **API**: `POST /api/themes/activate/:id`
- **CLI**: `lavapanel theme activate <theme-name>`
