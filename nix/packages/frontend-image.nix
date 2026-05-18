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

    # Best practice: run as non-root user
    User = "node:node";
  };

  extraCommands = ''
    # Create app directory structure
    mkdir -p app

    # Copy the entire frontend build output (includes .next/standalone/, public/, package.json)
    cp -rT ${frontend} app

    # Verify structure
    if [ -f "app/.next/standalone/server.js" ]; then
      echo "✓ Next.js standalone server found"
    else
      echo "✗ Error: Next.js server not found at app/.next/standalone/server.js"
      exit 1
    fi

    # Verify static assets are in standalone
    if [ -d "app/.next/standalone/.next/static" ]; then
      echo "✓ Static assets found in standalone/.next/static"
    else
      echo "✗ Error: Static assets not found in standalone/.next/static"
      exit 1
    fi

    # Create non-root user
    mkdir -p etc
    echo "node:x:1000:1000:node:/app:/sbin/nologin" > etc/passwd
    echo "node:x:1000:" > etc/group

    # Set proper permissions for app directory
    # Note: we can't use chown in the Nix builder, but the User config will handle running as non-root
    chmod -R a+r app
  '';

  meta = {
    description = "Docker image for amirsalarsafaei.com frontend";
    license = lib.licenses.mit;
  };
}
