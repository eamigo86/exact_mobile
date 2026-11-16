# Exact Todo — commands for the Exact app in mobile/.
# Exact has no packaged CLI: the app runs against a source checkout of expo/exact
# (EXACT_SDK) with the Bun version that checkout pins.

SHELL := /bin/bash
.DEFAULT_GOAL := help

BUN_VERSION  ?= 1.4.2
BUN_HOME     ?= $(HOME)/.bun-$(BUN_VERSION)
EXACT_SDK    ?= $(HOME)/.exact/exact2
EXACT_REPO   ?= https://github.com/expo/exact.git
APP_DIR      ?= mobile
ANDROID_HOME ?= $(HOME)/Library/Android/sdk
ANDROID_PLATFORM ?= platforms;android-37.2
AVD          ?= $(shell "$(ANDROID_HOME)/emulator/emulator" -list-avds 2>/dev/null | head -1)

export PATH := $(BUN_HOME)/bin:$(PATH)
export ANDROID_HOME
export EXACT := $(EXACT_SDK)

RUN := cd $(APP_DIR) && bun exact.mjs

.PHONY: help bun sdk setup setup-android doctor sdk-update types check fmt \
        web test test-config test-storage test-chart test-location test-ios test-android verify verify-ios verify-android \
        ios ios-prebuild android android-bundle emulator mac share clean

help: ## List every target
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# --- Toolchain -------------------------------------------------------------

bun: ## Install the pinned Bun beside any other Bun (no shell rc edits)
	@if [ "$$($(BUN_HOME)/bin/bun --version 2>/dev/null)" = "$(BUN_VERSION)" ]; then echo "bun $(BUN_VERSION) ok"; else \
	  arch=$$(uname -m | sed 's/arm64/aarch64/;s/x86_64/x64/'); tmp=$$(mktemp -d); \
	  curl -fsSL -o $$tmp/bun.zip https://github.com/oven-sh/bun/releases/download/bun-v$(BUN_VERSION)/bun-darwin-$$arch.zip && \
	  unzip -q $$tmp/bun.zip -d $$tmp && mkdir -p $(BUN_HOME)/bin && mv $$tmp/bun-darwin-$$arch/bun $(BUN_HOME)/bin/bun && rm -rf $$tmp; \
	  $(BUN_HOME)/bin/bun --version; fi

sdk: ## Clone the Exact SDK checkout into EXACT_SDK
	@test -d $(EXACT_SDK)/.git || git clone --depth 1 $(EXACT_REPO) $(EXACT_SDK)

setup: bun sdk ## Install everything: Bun, SDK, Rust toolchains, Hermes, crates
	cd $(EXACT_SDK) && bun scripts/exact.mjs setup

setup-android: ## Install the Android platform Exact builds against
	"$(ANDROID_HOME)/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$(ANDROID_HOME)" "$(ANDROID_PLATFORM)"

doctor: ## Show what this machine is missing (changes nothing)
	cd $(EXACT_SDK) && bun scripts/exact.mjs setup --check

sdk-update: ## Pull the SDK and report the app's lock drift
	cd $(EXACT_SDK) && git pull --ff-only && bun scripts/exact.mjs setup
	$(RUN) update

# --- Develop ---------------------------------------------------------------

types: ## Regenerate app.contract.d.ts (the types app.ts imports)
	$(RUN) contract types app.contract -o app.contract.d.ts

check: ## Compile the Contract and type-check app.ts (CI gate)
	$(RUN) contract build app.contract --json --errors-only

fmt: ## Format the Contract source
	$(RUN) contract fmt app.contract

web: ## Dev loop in the browser, rebuilds on save
	$(RUN) web

# --- Tests -----------------------------------------------------------------

test: ## Run the Contract tests on the web host
	$(RUN) test web

test-config: ## Check the manifest's launch colours and icons against the brand
	cd $(APP_DIR) && bun test app.config.test.mjs

test-storage: ## Run the data module against a fake storage: SQLite and the one-time JSON import (bun:sqlite)
	cd $(APP_DIR) && bun test app.storage.test.mjs

test-chart: ## Chart maths and the Market sources against a stubbed fetch and socket (bun)
	cd $(APP_DIR) && bun test chart.test.mjs app.market.test.mjs

test-location: ## Drive the Location card with a preferred permission and position (agent, web host)
	$(RUN) web-build && bun test app.test.mjs

test-ios: ## Build, then run the Contract tests on an iOS Simulator
	$(RUN) ios && bun exact.mjs test ios

test-android: ## Run the Contract tests on the device ANDROID_SERIAL names (build first: make android)
	$(RUN) test android

verify: ## Full web check: tests, light/dark, widths, large text
	$(RUN) verify web

verify-ios: ## Build, then the full iOS Simulator check
	$(RUN) ios && bun exact.mjs verify ios

verify-android: ## Full Android check (needs a running emulator: make emulator)
	$(RUN) verify android

# --- Run on devices --------------------------------------------------------

ios: ## Build and open on an iOS Simulator (EXACT_SIM picks one)
	$(RUN) ios --run

ios-prebuild: ## First iOS build in the background (10-15 min)
	$(RUN) ios --prebuild

android: ## Build, install and open on the emulator or phone
	$(RUN) android --run

android-bundle: ## Signed Android App Bundle for release
	$(RUN) android --bundle

emulator: ## Boot the Android emulator (AVD=<name> to choose)
	@test -n "$(AVD)" || { echo "No AVD found: create one in Android Studio"; exit 1; }
	"$(ANDROID_HOME)/emulator/emulator" -avd "$(AVD)" >/dev/null 2>&1 &
	"$(ANDROID_HOME)/platform-tools/adb" wait-for-device

mac: ## Build and open as a macOS app
	$(RUN) mac --run

share: ## AppDrop link to install the iOS app on your own phone
	$(RUN) share

clean: ## Remove the app's build output (.exact/)
	rm -rf $(APP_DIR)/.exact
