.PHONY: dev build install release clean help

dev:
	./scripts/dev.sh

dev-android:
	./scripts/dev.sh android

dev-ios:
	./scripts/dev.sh ios

dev-web:
	./scripts/dev.sh web

build:
	./scripts/build.sh android

build-release:
	./scripts/build.sh android --release

build-ios:
	./scripts/build.sh ios

build-web:
	./scripts/build.sh web

build-all:
	./scripts/build.sh all --release

install:
	./scripts/install.sh

install-release:
	./scripts/install.sh --release

release:
	@echo "Usage: make release-patch, release-minor, or release-major"

release-patch:
	./scripts/release.sh patch

release-minor:
	./scripts/release.sh minor

release-major:
	./scripts/release.sh major

clean:
	./scripts/build.sh android --clean
	rm -rf builds .expo dist 2>/dev/null || true

help:
	@echo "JellyChub Makefile"
	@echo ""
	@echo "Development:"
	@echo "  make dev            Start dev server"
	@echo "  make dev-android    Run on Android"
	@echo "  make dev-ios        Run on iOS"
	@echo "  make dev-web        Run in browser"
	@echo ""
	@echo "Building:"
	@echo "  make build          Build debug APK"
	@echo "  make build-release  Build release APK"
	@echo "  make build-ios      Build iOS"
	@echo "  make build-web      Build web bundle"
	@echo "  make build-all      Build all platforms (release)"
	@echo ""
	@echo "Install:"
	@echo "  make install        Install debug on device"
	@echo "  make install-release Install release on device"
	@echo ""
	@echo "Release:"
	@echo "  make release-patch  Release patch (1.2.3 -> 1.2.4)"
	@echo "  make release-minor  Release minor (1.2.3 -> 1.3.0)"
	@echo "  make release-major  Release major (1.2.3 -> 2.0.0)"
	@echo ""
	@echo "Other:"
	@echo "  make clean          Remove build artifacts"
