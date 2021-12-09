.PHONY: dev
dev:
	deno run -A main.ts

.PHONY: fmt
fmt:
	deno fmt
