.PHONY: help build test clean publish publish-patch publish-minor publish-major check-auth status

# Default target
help:
	@echo "Available commands:"
	@echo "  build          - Build the TypeScript project"
	@echo "  test           - Run tests (if available)"
	@echo "  clean          - Clean build artifacts"
	@echo "  status         - Show current package status"
	@echo "  check-auth     - Check npm authentication"
	@echo "  publish        - Publish current version to npm"
	@echo "  publish-patch  - Bump patch version and publish"
	@echo "  publish-minor  - Bump minor version and publish"
	@echo "  publish-major  - Bump major version and publish"

# Build the project
build:
	@echo "Building project..."
	npm run build
	@echo "Build complete."

# Run tests (placeholder for future)
test:
	@echo "Running tests..."
	@if [ -f "package.json" ] && grep -q '"test"' package.json; then \
		npm test; \
	else \
		echo "No tests configured."; \
	fi

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf server/
	rm -rf node_modules/.cache
	@echo "Clean complete."

# Show current package status
status:
	@echo "Package status:"
	@echo "Name: $(shell node -p "require('./package.json').name")"
	@echo "Version: $(shell node -p "require('./package.json').version")"
	@echo "Registry: $(shell npm config get registry)"
	@echo ""
	@echo "Git status:"
	@git status --porcelain || echo "Not in a git repository"

# Check npm authentication
check-auth:
	@echo "Checking npm authentication..."
	@npm whoami || (echo "Not logged in to npm. Run 'npm login' first." && exit 1)
	@echo "Authentication OK."

# Publish current version
publish: check-auth build test
	@echo "Publishing current version..."
	@echo "Current version: $(shell node -p "require('./package.json').version")"
	@read -p "Publish this version? [y/N] " confirm && [ "$$confirm" = "y" ]
	npm publish
	@echo "Published successfully!"

# Bump patch version and publish
publish-patch: check-auth build test
	@echo "Bumping patch version and publishing..."
	npm version patch
	npm publish
	git push origin main --tags
	@echo "Patch version published and pushed!"

# Bump minor version and publish
publish-minor: check-auth build test
	@echo "Bumping minor version and publishing..."
	npm version minor
	npm publish
	git push origin main --tags
	@echo "Minor version published and pushed!"

# Bump major version and publish
publish-major: check-auth build test
	@echo "Bumping major version and publishing..."
	npm version major
	npm publish
	git push origin main --tags
	@echo "Major version published and pushed!"

# Pre-publish checks
pre-publish-check:
	@echo "Running pre-publish checks..."
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "Warning: There are uncommitted changes."; \
		git status --short; \
		echo ""; \
	fi
	@echo "Current package info:"
	@node -p "'Name: ' + require('./package.json').name"
	@node -p "'Version: ' + require('./package.json').version"
	@node -p "'Description: ' + require('./package.json').description"
	@echo ""