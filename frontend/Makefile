

deploy-files:
	@echo "Copying Next.js build to VPS..."
	@rsync -av --progress \
		--exclude 'cache' \
		./.next/ vps:/root/amirsalarsafaeicom/frontend/.next/
	@echo "Next.js build deployed successfully!"
