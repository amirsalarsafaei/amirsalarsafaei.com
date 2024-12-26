

deploy-files:
	@echo "Copying files to VPS..."
	@rsync -av --progress \
		--exclude 'target' \
		--exclude '.git' \
		--exclude '.gitignore' \
		--exclude '.env' \
		./dist/ vps:/var/www/amirsalarsafaei/
	@echo "Files copied successfully!"
