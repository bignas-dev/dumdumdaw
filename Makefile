.PHONY: sync run

run: sync
	uv run src/main.py

sync:
	uv sync
