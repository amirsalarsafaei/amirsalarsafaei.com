

deploy-files:
	@echo "Copying Next.js build to VPS..."
	@rsync -av --progress \
		--exclude 'cache' \
		./.next/ vps:/root/amirsalarsafaeicom/frontend/.next/
	@rsync -av --progress \
		./public/ vps:/root/amirsalarsafaeicom/frontend/public/
	@rsync -av --progress \
		./src/ vps:/root/amirsalarsafaeicom/frontend/src/
	@rsync -av --progress \
		./package.json vps:/root/amirsalarsafaeicom/frontend/package.json
	@rsync -av --progress \
		./yarn.lock vps:/root/amirsalarsafaeicom/frontend/yarn.lock
	@echo "Next.js build deployed successfully!"
