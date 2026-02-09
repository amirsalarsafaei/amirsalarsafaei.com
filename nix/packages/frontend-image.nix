{
  dockerTools,
  nodejs_20,
  cacert,
  tzdata,
  bash,
  coreutils,
  frontend,
}:

let
  nodejs = nodejs_20;
in
dockerTools.buildLayeredImage {
  name = "amirsalarsafaeicom-frontend";
  tag = "latest";

  contents = [
    frontend
    nodejs
    cacert
    tzdata
    bash
    coreutils
  ];

  config = {
    Entrypoint = [ "${nodejs}/bin/node" ];
    Cmd = [ "/app/server.js" ];
    ExposedPorts = {
      "3000/tcp" = { };
    };
    Env = [
      "NODE_ENV=production"
      "PORT=3000"
      "HOSTNAME=0.0.0.0"
      "SSL_CERT_FILE=${cacert}/etc/ssl/certs/ca-bundle.crt"
    ];
    WorkingDir = "/app";
  };

  extraCommands = ''
    mkdir -p app
    cp -r ${frontend}/* app/ || true
    cp -r ${frontend}/.next app/.next || true
  '';
}
