{
  description = "amirsalarsafaei.com - Personal website with Next.js frontend and Rust backend";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };
        lib = pkgs.lib;

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
        };

        # Import backend module
        backendModule = import ./nix/backend.nix { inherit pkgs lib; };
        
        # Import frontend module  
        frontendModule = import ./nix/frontend.nix { inherit pkgs lib; };

      in {
        packages = {
          # Packages
          backend = backendModule.package;
          frontend = frontendModule.package;
          
          # Container images
          backendImage = backendModule.image;
          frontendImage = frontendModule.image;
          
          # Default package
          default = backendModule.package;
        };

        # Dev shell with all tools needed
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            rustToolchain
            nodejs_20
            yarn
            protobuf
            buf
            pkg-config
            openssl
            openssl.dev
            postgresql
            podman
            skopeo
          ];

          env = {
            RUST_BACKTRACE = "full";
            OPENSSL_NO_VENDOR = "1";
            PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
          };

          shellHook = ''
            export OPENSSL_DIR="${pkgs.openssl.dev}"
            export OPENSSL_INCLUDE_DIR="${pkgs.openssl.dev}/include"
            export OPENSSL_LIB_DIR="${pkgs.openssl.out}/lib"
            echo "Development shell ready!"
            echo "Build images with:"
            echo "  nix build .#backendImage"
            echo "  nix build .#frontendImage"
          '';
        };
      }
    );
}
