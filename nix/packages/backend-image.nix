{
  dockerTools,
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
  };

  extraCommands = ''
    mkdir -p app/uploads
    mkdir -p config
  '';
}
