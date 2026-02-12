{
  dockerTools,
  lib,
  cacert,
  tzdata,
  backend,
}:

dockerTools.buildLayeredImage {
  name = "amirsalarsafaeicom-backend";
  tag = "latest";

  contents = [
    backend
    cacert
    tzdata
  ];

  config = {
    Entrypoint = [ "${backend}/bin/amirsalarsafaeicom-backend" ];
    Cmd = [
      "--config-path"
      "/config/config.toml"
      "--spotify-cred-path"
      "/config/spotify.toml"
    ];
    ExposedPorts = {
      "8000/tcp" = { };
      "3001/tcp" = { };
    };
    Env = [
      "SSL_CERT_FILE=${cacert}/etc/ssl/certs/ca-bundle.crt"
      "RUST_LOG=info"
    ];
    WorkingDir = "/app";
    Volumes = {
      "/app/uploads" = { };
      "/config" = { };
    };
    # Best practice: run as non-root user
    User = "app:app";
  };

  extraCommands = ''
    # Create non-root user and group
    mkdir -p etc
    echo "app:x:1000:1000:app:/app:/sbin/nologin" > etc/passwd
    echo "app:x:1000:" > etc/group

    # Create application directories
    mkdir -p app/uploads
    mkdir -p config

    # Set proper permissions for application directories
    # Note: we can't use chown in the Nix builder, but the User config will handle running as non-root
    chmod -R a+r app
    chmod -R a+r config
  '';

  meta = {
    description = "Docker image for amirsalarsafaei.com backend";
    license = lib.licenses.mit;
  };
}
