.PHONY: up down build restart logs clean install dev

# ─── Docker Commands ──────────────────────────────────────────────────────────
up:
	cp -n .env.example .env 2>/dev/null || true
	docker compose up -d

down:
	docker compose down

build:
	docker compose build --no-cache

restart:
	docker compose restart

logs:
	docker compose logs -f

logs-%:
	docker compose logs -f $*

clean:
	docker compose down -v --remove-orphans

# ─── Local Development ────────────────────────────────────────────────────────
install:
	@echo "Installing dependencies for all services..."
	cd services/api-gateway && npm install
	cd services/auth-service && npm install
	cd services/product-service && npm install
	cd services/order-service && npm install
	cd services/payment-service && npm install
	cd services/notification-service && npm install
	cd frontend && npm install

dev-infra:
	docker compose up -d mongodb redis rabbitmq

dev:
	make dev-infra
	@echo "Start each service manually: cd services/<name> && npm run dev"

# ─── Stripe CLI (for local webhook testing) ───────────────────────────────────
stripe-listen:
	stripe listen --forward-to localhost:3004/api/payments/webhook

# ─── Helpers ──────────────────────────────────────────────────────────────────
ps:
	docker compose ps

health:
	@echo "API Gateway:"; curl -s http://localhost:3000/health | jq .
	@echo "Auth:"; curl -s http://localhost:3001/health | jq .
	@echo "Products:"; curl -s http://localhost:3002/health | jq .
	@echo "Orders:"; curl -s http://localhost:3003/health | jq .
	@echo "Payments:"; curl -s http://localhost:3004/health | jq .
