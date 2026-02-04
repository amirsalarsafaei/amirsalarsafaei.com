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

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      rust-overlay,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ (import rust-overlay) ];
        };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [
            "rust-src"
            "rust-analyzer"
          ];
        };

        backendModule = import ./nix/backend.nix {
          inherit pkgs;
          inherit (pkgs) lib;
          src = ./.;
        };

        frontendModule = import ./nix/frontend.nix {
          inherit pkgs;
          inherit (pkgs) lib;
          src = ./.;
        };

      in
      {
        packages = {
          backend = backendModule.package;
          frontend = frontendModule.package;
          backendImage = backendModule.image;
          frontendImage = frontendModule.image;
          default = backendModule.package;
        };

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
