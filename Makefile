.PHONY: run sync lint format

run: sync ## Install project dependencies
	uv run src/main.py

sync: ## Install project dependencies
	uv sync

check: ## Check code with Ruff
	 ruff check .

format: ## Format code with Ruff
	ruff format .
