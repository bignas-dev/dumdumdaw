# Configuration
APP_NAME := dumdumdaw
IMAGE := ghcr.io/bignas-dev/$(APP_NAME)
.PHONY: run sync lint format docker-build docker-run docker-stop docker-push docker-pull docker-deploy cloc help

run: sync ## Install project dependencies
	uv run src/main.py

sync: ## Install project dependencies
	uv sync

check: ## Check code with Ruff
	 ruff check .

format: ## Format code with Ruff
	ruff format .

# Docker
docker-build: ## Build Docker image
	docker build -t $(APP_NAME):latest .

docker-run: ## Run container locally
	docker run -d --name $(APP_NAME) \
		-p 3000:3000 \
		$(APP_NAME):latest

docker-stop: ## Stop and remove local container
	docker rm -f $(APP_NAME)

# GHCR
docker-push: docker-build ## Build and push image to GHCR
	docker tag $(APP_NAME):latest $(IMAGE):latest
	docker push $(IMAGE):latest

docker-pull: ## Pull image from GHCR
	docker pull $(IMAGE):latest

cloc: ## Count lines of code
	cloc . --vcs git

help: ## Help message
	@echo "usage:"
	@echo
	@sed -n 's/^\([A-Za-z0-9_.-]*\):.*## \(.*\)$$/\t\1: \2/p' Makefile | sort | column -t -s ':'
	@echo
