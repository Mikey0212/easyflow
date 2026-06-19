# Contributing to easyflow

Thank you for your interest in contributing to easyflow! 🎉

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/easyflow.git
   cd easyflow
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Build**:
   ```bash
   npm run build
   ```
5. **Run tests**:
   ```bash
   npm test
   ```

## Development Workflow

1. Create a feature branch from `master`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes
3. Run tests to make sure nothing is broken:
   ```bash
   npm test
   ```
4. Commit your changes (see commit conventions below)
5. Push to your fork and open a Pull Request

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation only
- `style` — Formatting, no code change
- `refactor` — Code change that neither fixes a bug nor adds a feature
- `test` — Adding or updating tests
- `chore` — Build process, CI, or auxiliary tool changes

**Examples:**
```
feat(init): add support for Kiro platform
fix(doctor): correct bash detection on Windows
docs: update CLI options table
```

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include tests for new features or bug fixes
- Update documentation if your change affects CLI behavior or user-facing output
- Ensure `npm test` passes before submitting
- Fill in the PR template (if provided)

## Reporting Issues

- Use [GitHub Issues](https://github.com/Mikey0212/easyflow/issues)
- Include your environment: OS, Node.js version, npm version
- Provide steps to reproduce the issue
- Include relevant logs or screenshots

## Code Style

- TypeScript strict mode
- Use ES modules (`import`/`export`)
- Prefer `const` over `let`; avoid `var`
- Use descriptive variable/function names

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
