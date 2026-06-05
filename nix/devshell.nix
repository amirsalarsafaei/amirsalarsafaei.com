{
  pkgs,
  rustToolchain,
}:

pkgs.mkShell {
  name = "amirsalarsafaeicom-dev";

  packages = [
    rustToolchain
    pkgs.nodejs_20
    pkgs.yarn
    pkgs.protobuf
    pkgs.buf
    pkgs.just
    pkgs.sqlx-cli
    pkgs.pkg-config
    pkgs.openssl
    pkgs.openssl.dev
    pkgs.postgresql
    pkgs.treefmt
    pkgs.nixfmt-rfc-style
    pkgs.nodePackages.prettier
    pkgs.rustfmt
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
    echo "🚀 amirsalarsafaei.com development shell"
    echo ""
    echo "Available commands:"
    echo "  just                         - List project tasks"
    echo "  nix build .#backend        - Build backend"
    echo "  nix build .#frontend       - Build frontend"
    echo "  nix build .#backendImage   - Build backend Docker image"
    echo "  nix build .#frontendImage  - Build frontend Docker image"
    echo ""
  '';
}
