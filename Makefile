
.PHONY: buf-generate clean

create-output-dirs:
	@mkdir -p autogenerated/ts
	@mkdir -p autogenerated/rust/src

buf-generate: clean create-output-dirs
	@buf generate

clean:
	@rm -rf autogenerated/ts
	@rm -rf autogenerated/rust

buf-lint:
	@buf lint

buf-breaking:
	@buf breaking --against '.git#branch=main'

buf-gen-ts: clean
	@mkdir -p autogenerated/ts
	@buf generate --template buf.gen.yaml --path proto --include-imports

buf-gen-rust: clean
	@mkdir -p autogenerated/rust
	@buf generate --template buf.gen.yaml --path proto --include-imports
create-output-dir:
	@mkdir -p autogenerated/ts

deploy-files:
	@echo "Copying files to VPS..."
	@rsync -av --progress \
		--exclude 'target' \
		--exclude '.git' \
		--exclude '.gitignore' \
		--exclude '.env' \
		./dist/ vps:/var/www/amirsalarsafaei/
	@echo "Files copied successfully!"