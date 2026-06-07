# Contributing to LavaPanel

Thank you for your interest in contributing! This guide will help you get started.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Keep discussions professional

## How to Contribute

### Reporting Bugs

1. Check if bug already exists
2. Create new issue with:
   - Clear description
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots (if applicable)
   - Environment info (OS, Node version, etc.)

### Suggesting Features

1. Check if feature already exists
2. Create issue with:
   - Feature description
   - Use case
   - Proposed implementation (optional)
   - Alternatives considered

### Pull Requests

1. Fork the repository
2. Create branch (`git checkout -b feature/amazing-feature`)
3. Make changes
4. Test thoroughly
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open Pull Request

### Development Setup

```bash
# Fork and clone
git clone https://github.com/your-username/LavaPanel.git
cd LavaPanel

# Install dependencies
npm install

# Create branch
git checkout -b feature/your-feature

# Start development server
npm run dev
```

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Max line length: 100 characters
- Use meaningful variable names
- Add comments for complex logic

### Testing

```bash
# Run tests
npm test

# Run specific test file
npm test -- tests/feature.test.js
```

### Commit Messages

Follow conventional commits:

```
feat: add new feature
fix: fix bug
docs: update documentation
style: format code
refactor: refactor code
test: add tests
chore: update dependencies
```

Example:
```
feat(discord): add giveaway command

- Implement /giveaway slash command
- Add timing system for giveaways
- Track participants via reactions
- Auto-select winner

Closes #42
```

## Areas Needing Help

### High Priority
- [ ] Resource monitoring dashboard
- [ ] Backup/restore system
- [ ] Multi-server management UI
- [ ] API documentation
- [ ] Unit tests

### Medium Priority
- [ ] Additional Minecraft templates
- [ ] More Discord bot templates
- [ ] Plugin marketplace
- [ ] Mobile responsive design
- [ ] Performance optimizations

### Low Priority
- [ ] Additional themes
- [ ] Documentation translations
- [ ] Tutorial videos
- [ ] Example configurations

## Questions?

- Join our Discord server
- Open a discussion on GitHub
- Contact maintainers

Thank you for contributing! 🌋
