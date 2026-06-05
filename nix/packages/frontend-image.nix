{
  dockerTools,
  lib,
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
    nodejs
    cacert
    tzdata
    bash
    coreutils
  ];

  config = {
    Entrypoint = [ "${nodejs}/bin/node" ];
    Cmd = [ ".next/standalone/server.js" ];

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

    User = "node:node";
  };

  extraCommands = ''
    mkdir -p app

    cp -rT ${frontend} app

    if [ -f "app/.next/standalone/server.js" ]; then
      echo "✓ Next.js standalone server found"
    else
      echo "✗ Error: Next.js server not found at app/.next/standalone/server.js"
      exit 1
    fi

    if [ -d "app/.next/standalone/.next/static" ]; then
      echo "✓ Static assets found in standalone/.next/static"
    else
      echo "✗ Error: Static assets not found in standalone/.next/static"
      exit 1
    fi

    mkdir -p etc
    echo "node:x:1000:1000:node:/app:/sbin/nologin" > etc/passwd
    echo "node:x:1000:" > etc/group

    chmod -R a+r app
  '';

  meta = {
    description = "Docker image for amirsalarsafaei.com frontend";
    license = lib.licenses.mit;
    platforms = lib.platforms.linux;
  };
}
