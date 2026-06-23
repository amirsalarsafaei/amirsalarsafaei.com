{ inputs }:

{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.services.amirsalarsafaei-com;
  inherit (lib) types;

  websitePackages = inputs.amirsalarsafaei-com.packages.${pkgs.system};
  frontendPackage =
    if cfg.frontend.env == "local" then websitePackages.frontendLocal else websitePackages.frontend;

  originList = lib.concatMapStringsSep ", " (origin: ''"${origin}"'') cfg.backend.allowedOrigins;

  backendConfigFile = pkgs.writeText "amirsalarsafaei-com-config.toml" ''
    auth_token = ""

    [database]
    url = ""

    [server]
    host = "${cfg.backend.host}"
    port = ${toString cfg.backend.port}
    allowed_origins = [${originList}]

    [image_server]
    host = "${cfg.backend.imageHost}"
    port = ${toString cfg.backend.imagePort}
    upload_dir = "${cfg.backend.uploadDir}"
  '';

  spotifyConfigFile = pkgs.writeText "amirsalarsafaei-com-spotify.toml" ''
    client_id = ""
    client_secret = ""
    refresh_token = ""
    redirect_uri = "${cfg.spotify.redirectUri}"
  '';

  databaseUrl = "postgres://${cfg.database.user}:${cfg.database.password}@${cfg.database.host}:${toString cfg.database.port}/${cfg.database.name}";

  backendEnvironment = {
    AUTH_TOKEN = cfg.authToken;
    DATABASE_URL = databaseUrl;
    IMAGE_UPLOAD_DIR = cfg.backend.uploadDir;
    IMAGE_SERVER_HOST = cfg.backend.imageHost;
    IMAGE_SERVER_PORT = toString cfg.backend.imagePort;
    SPOTIFY_REDIRECT_URI = cfg.spotify.redirectUri;
    RUST_LOG = cfg.backend.logLevel;
  }
  // lib.optionalAttrs (cfg.spotify.clientId != "") {
    SPOTIFY_CLIENT_ID = cfg.spotify.clientId;
  }
  // lib.optionalAttrs (cfg.spotify.clientSecret != "") {
    SPOTIFY_CLIENT_SECRET = cfg.spotify.clientSecret;
  }
  // lib.optionalAttrs (cfg.spotify.refreshToken != "") {
    SPOTIFY_REFRESH_TOKEN = cfg.spotify.refreshToken;
  };

  sshEnvironment = {
    SSH_HOST = cfg.ssh.host;
    SSH_PORT = toString cfg.ssh.port;
    SSH_HOST_KEY_PATH = cfg.ssh.hostKeyPath;
    # tuissh talks to the same backend the website does, over plain gRPC on the
    # loopback interface.
    GRPC_ADDR = "${cfg.backend.host}:${toString cfg.backend.port}";
    GRPC_TLS = lib.boolToString cfg.ssh.grpcTls;
    WEB_ADDR = cfg.ssh.webAddr;
  };
  backendLauncher = pkgs.writeShellScript "amirsalarsafaei-com-backend" ''
    set -eu

    if [ -n "''${CREDENTIALS_DIRECTORY:-}" ]; then
      [ -f "$CREDENTIALS_DIRECTORY/auth-token" ] && export AUTH_TOKEN="$(cat "$CREDENTIALS_DIRECTORY/auth-token")"
      [ -f "$CREDENTIALS_DIRECTORY/database-password" ] && export DATABASE_URL="postgres://${cfg.database.user}:$(cat "$CREDENTIALS_DIRECTORY/database-password")@${cfg.database.host}:${toString cfg.database.port}/${cfg.database.name}"
      [ -f "$CREDENTIALS_DIRECTORY/spotify-client-id" ] && export SPOTIFY_CLIENT_ID="$(cat "$CREDENTIALS_DIRECTORY/spotify-client-id")"
      [ -f "$CREDENTIALS_DIRECTORY/spotify-client-secret" ] && export SPOTIFY_CLIENT_SECRET="$(cat "$CREDENTIALS_DIRECTORY/spotify-client-secret")"
      [ -f "$CREDENTIALS_DIRECTORY/spotify-refresh-token" ] && export SPOTIFY_REFRESH_TOKEN="$(cat "$CREDENTIALS_DIRECTORY/spotify-refresh-token")"
    fi

    exec ${websitePackages.backend}/bin/amirsalarsafaeicom-backend \
      --config-path ${backendConfigFile} \
      --spotify-cred-path ${spotifyConfigFile}
  '';

  # Gate the backend unit's "started" state on the gRPC-web port actually
  # accepting connections. With Type=simple the unit is otherwise considered
  # up the instant the process spawns — before it has connected to Postgres,
  # run migrations, and begun serving. Used as ExecStartPost so dependents
  # ordered `after` the backend (frontend, ssh) only start once it is ready.
  backendReadyScript = pkgs.writeShellScript "amirsalarsafaei-com-backend-ready" ''
    for _ in $(${pkgs.coreutils}/bin/seq 1 60); do
      if (exec 3<>/dev/tcp/${cfg.backend.host}/${toString cfg.backend.port}) 2>/dev/null; then
        exit 0
      fi
      ${pkgs.coreutils}/bin/sleep 1
    done
    echo "amirsalarsafaei.com backend not ready on ${cfg.backend.host}:${toString cfg.backend.port}" >&2
    exit 1
  '';
in
{
  options.services.amirsalarsafaei-com = {
    enable = lib.mkEnableOption "amirsalarsafaei.com personal website";

    domain = lib.mkOption {
      type = types.str;
      default = "amirsalarsafaei.com";
      description = "Public domain name for the website.";
    };

    packageSet = lib.mkOption {
      type = types.attrs;
      default = websitePackages;
      defaultText = "inputs.amirsalarsafaei-com.packages.\${pkgs.system}";
      readOnly = true;
      description = "Package set exported by the amirsalarsafaei-com flake.";
    };

    authToken = lib.mkOption {
      type = types.str;
      default = "";
      description = "Backend admin authentication token. Prefer authTokenFile for real deployments.";
    };

    authTokenFile = lib.mkOption {
      type = types.nullOr types.str;
      default = null;
      description = "File containing AUTH_TOKEN for systemd LoadCredential.";
    };

    user = lib.mkOption {
      type = types.str;
      default = "amirsalarsafaei-com";
      description = "System user used by backend and frontend services.";
    };

    group = lib.mkOption {
      type = types.str;
      default = "amirsalarsafaei-com";
      description = "System group used by backend and frontend services.";
    };

    database = {
      createLocally = lib.mkOption {
        type = types.bool;
        default = true;
        description = "Whether to configure a local PostgreSQL database.";
      };

      name = lib.mkOption {
        type = types.str;
        default = "amirsalarsafaeicom";
        description = "PostgreSQL database name.";
      };

      user = lib.mkOption {
        type = types.str;
        default = "amirsalarsafaeicom";
        description = "PostgreSQL user.";
      };

      password = lib.mkOption {
        type = types.str;
        default = "";
        description = "PostgreSQL password. Prefer passwordFile for real deployments.";
      };

      passwordFile = lib.mkOption {
        type = types.nullOr types.str;
        default = null;
        description = "File containing the PostgreSQL password for systemd LoadCredential.";
      };

      host = lib.mkOption {
        type = types.str;
        default = "127.0.0.1";
        description = "PostgreSQL host used by the backend.";
      };

      port = lib.mkOption {
        type = types.port;
        default = 5432;
        description = "PostgreSQL port used by the backend.";
      };
    };

    spotify = {
      clientId = lib.mkOption {
        type = types.str;
        default = "";
        description = "Spotify client ID. Prefer clientIdFile for real deployments.";
      };

      clientIdFile = lib.mkOption {
        type = types.nullOr types.str;
        default = null;
        description = "File containing SPOTIFY_CLIENT_ID for systemd LoadCredential.";
      };

      clientSecret = lib.mkOption {
        type = types.str;
        default = "";
        description = "Spotify client secret. Prefer clientSecretFile for real deployments.";
      };

      clientSecretFile = lib.mkOption {
        type = types.nullOr types.str;
        default = null;
        description = "File containing SPOTIFY_CLIENT_SECRET for systemd LoadCredential.";
      };

      refreshToken = lib.mkOption {
        type = types.str;
        default = "";
        description = "Spotify refresh token. Prefer refreshTokenFile for real deployments.";
      };

      refreshTokenFile = lib.mkOption {
        type = types.nullOr types.str;
        default = null;
        description = "File containing SPOTIFY_REFRESH_TOKEN for systemd LoadCredential.";
      };

      redirectUri = lib.mkOption {
        type = types.str;
        default = "https://${cfg.domain}/callback";
        defaultText = "https://\${config.services.amirsalarsafaei-com.domain}/callback";
        description = "Spotify redirect URI.";
      };
    };

    backend = {
      host = lib.mkOption {
        type = types.str;
        default = "127.0.0.1";
        description = "Backend gRPC-web bind host.";
      };

      port = lib.mkOption {
        type = types.port;
        default = 8000;
        description = "Backend gRPC-web port.";
      };

      imageHost = lib.mkOption {
        type = types.str;
        default = "127.0.0.1";
        description = "Image server bind host.";
      };

      imagePort = lib.mkOption {
        type = types.port;
        default = 3001;
        description = "Image server port.";
      };

      uploadDir = lib.mkOption {
        type = types.str;
        default = "/var/lib/amirsalarsafaei-com/uploads";
        description = "Upload directory for images.";
      };

      allowedOrigins = lib.mkOption {
        type = types.listOf types.str;
        default = [ "https://${cfg.domain}" ];
        defaultText = ''[ "https://\${config.services.amirsalarsafaei-com.domain}" ]'';
        description = "CORS origins allowed by the gRPC-web backend.";
      };

      logLevel = lib.mkOption {
        type = types.str;
        default = "info";
        description = "RUST_LOG value for the backend service.";
      };
    };

    frontend = {
      port = lib.mkOption {
        type = types.port;
        default = 3000;
        description = "Frontend port.";
      };

      host = lib.mkOption {
        type = types.str;
        default = "127.0.0.1";
        description = "Frontend bind host.";
      };

      env = lib.mkOption {
        type = types.enum [
          "production"
          "local"
        ];
        default = "production";
        description = "Frontend build environment.";
      };

      grpcWebUrl = lib.mkOption {
        type = types.str;
        default = "https://grpc-api.${cfg.domain}";
        defaultText = "https://grpc-api.\${config.services.amirsalarsafaei-com.domain}";
        description = "Public gRPC-web URL exposed to the frontend runtime.";
      };

      imageServerUrl = lib.mkOption {
        type = types.str;
        default = "https://upload.${cfg.domain}";
        defaultText = "https://upload.\${config.services.amirsalarsafaei-com.domain}";
        description = "Public image server URL exposed to the frontend runtime.";
      };
    };

    ssh = {
      enable = lib.mkEnableOption "the SSH terminal front-end (tuissh)";

      package = lib.mkOption {
        type = types.package;
        default = websitePackages.tuissh;
        defaultText = "inputs.amirsalarsafaei-com.packages.\${pkgs.system}.tuissh";
        description = "tuissh package to run.";
      };

      host = lib.mkOption {
        type = types.str;
        default = "0.0.0.0";
        description = "Address the SSH server binds to.";
      };

      port = lib.mkOption {
        type = types.port;
        default = 23234;
        description = "Port the SSH server listens on.";
      };

      hostKeyPath = lib.mkOption {
        type = types.str;
        default = "/var/lib/amirsalarsafaei-com-ssh/ssh_host_ed25519_key";
        description = ''
          Path to the SSH host private key. tuissh generates one here on first
          start if it is missing, so this must live under a directory the
          service can write to (the default is inside its StateDirectory).
        '';
      };

      webAddr = lib.mkOption {
        type = types.str;
        default = ":2223";
        description = ''
          Listen address for the browser bridge (xterm.js over WebSocket).
          Set to an empty string to disable the bridge.
        '';
      };

      grpcTls = lib.mkOption {
        type = types.bool;
        default = false;
        description = "Whether the connection to the backend gRPC API uses TLS.";
      };

      openFirewall = lib.mkOption {
        type = types.bool;
        default = true;
        description = "Open the SSH port in the firewall (the SSH front-end is meant to be reachable publicly).";
      };
    };
  };

  config = lib.mkIf cfg.enable {
    assertions = [
      {
        assertion = cfg.authToken != "" || cfg.authTokenFile != null;
        message = "services.amirsalarsafaei-com.authToken or authTokenFile must be set.";
      }
      {
        assertion = cfg.database.password != "" || cfg.database.passwordFile != null;
        message = "services.amirsalarsafaei-com.database.password or passwordFile must be set.";
      }
    ];

    services.postgresql = lib.mkIf cfg.database.createLocally {
      enable = true;
      ensureDatabases = [ cfg.database.name ];
      ensureUsers = [
        {
          name = cfg.database.user;
          ensureDBOwnership = true;
        }
      ];
      authentication = lib.mkAfter ''
        host ${cfg.database.name} ${cfg.database.user} 127.0.0.1/32 md5
      '';
    };

    users.users.${cfg.user} = {
      isSystemUser = true;
      inherit (cfg) group;
      home = "/var/lib/amirsalarsafaei-com";
      createHome = true;
    };

    users.groups.${cfg.group} = { };

    systemd.tmpfiles.rules = [
      "d ${cfg.backend.uploadDir} 0750 ${cfg.user} ${cfg.group} -"
    ];

    systemd.services.amirsalarsafaei-com-backend = {
      description = "amirsalarsafaei.com backend";
      wantedBy = [ "multi-user.target" ];
      after = [
        "network-online.target"
      ]
      ++ lib.optional cfg.database.createLocally "postgresql.service";
      wants = [ "network-online.target" ];
      requires = lib.optional cfg.database.createLocally "postgresql.service";

      environment = backendEnvironment;

      serviceConfig = {
        Type = "simple";
        ExecStart = backendLauncher;
        # Hold the unit "starting" until the gRPC-web port is serving, so
        # units ordered after the backend only start once it is ready.
        ExecStartPost = backendReadyScript;
        TimeoutStartSec = "90s";
        Restart = "on-failure";
        RestartSec = "5s";
        User = cfg.user;
        Group = cfg.group;
        StateDirectory = "amirsalarsafaei-com";
        RuntimeDirectory = "amirsalarsafaei-com";
        WorkingDirectory = "/var/lib/amirsalarsafaei-com";
        LoadCredential =
          lib.optionals (cfg.authTokenFile != null) [ "auth-token:${cfg.authTokenFile}" ]
          ++ lib.optionals (cfg.database.passwordFile != null) [
            "database-password:${cfg.database.passwordFile}"
          ]
          ++ lib.optionals (cfg.spotify.clientIdFile != null) [
            "spotify-client-id:${cfg.spotify.clientIdFile}"
          ]
          ++ lib.optionals (cfg.spotify.clientSecretFile != null) [
            "spotify-client-secret:${cfg.spotify.clientSecretFile}"
          ]
          ++ lib.optionals (cfg.spotify.refreshTokenFile != null) [
            "spotify-refresh-token:${cfg.spotify.refreshTokenFile}"
          ];
        NoNewPrivileges = true;
        PrivateTmp = true;
        ProtectHome = true;
        ProtectSystem = "strict";
        ReadWritePaths = [
          "/var/lib/amirsalarsafaei-com"
          cfg.backend.uploadDir
        ];
      };
    };

    systemd.services.amirsalarsafaei-com-frontend = {
      description = "amirsalarsafaei.com frontend";
      wantedBy = [ "multi-user.target" ];
      after = [
        "network-online.target"
        "amirsalarsafaei-com-backend.service"
      ];
      wants = [ "network-online.target" ];

      environment = {
        PORT = toString cfg.frontend.port;
        HOSTNAME = cfg.frontend.host;
        NODE_ENV = "production";
        NEXT_PUBLIC_GRPC_WEB_URL = cfg.frontend.grpcWebUrl;
        NEXT_PUBLIC_IMAGE_SERVER_WEB_URL = cfg.frontend.imageServerUrl;
      };

      serviceConfig = {
        Type = "simple";
        WorkingDirectory = frontendPackage;
        ExecStart = "${pkgs.nodejs_20}/bin/node .next/standalone/server.js";
        Restart = "on-failure";
        RestartSec = "5s";
        User = cfg.user;
        Group = cfg.group;
        NoNewPrivileges = true;
        PrivateTmp = true;
        ProtectHome = true;
        ProtectSystem = "strict";
      };
    };

    networking.firewall.allowedTCPPorts = lib.mkIf (cfg.ssh.enable && cfg.ssh.openFirewall) [
      cfg.ssh.port
    ];

    systemd.services.amirsalarsafaei-com-ssh = lib.mkIf cfg.ssh.enable {
      description = "amirsalarsafaei.com SSH terminal (tuissh)";
      wantedBy = [ "multi-user.target" ];
      after = [
        "network-online.target"
        "amirsalarsafaei-com-backend.service"
      ];
      wants = [ "network-online.target" ];

      environment = sshEnvironment;

      serviceConfig = {
        Type = "simple";
        ExecStart = lib.getExe cfg.ssh.package;
        Restart = "on-failure";
        RestartSec = "5s";
        User = cfg.user;
        Group = cfg.group;
        # tuissh writes/generates its SSH host key under this state directory.
        StateDirectory = "amirsalarsafaei-com-ssh";
        StateDirectoryMode = "0750";
        WorkingDirectory = "/var/lib/amirsalarsafaei-com-ssh";
        # Allow binding the privileged SSH port (e.g. 22) as a non-root user.
        AmbientCapabilities = lib.optional (cfg.ssh.port < 1024) "CAP_NET_BIND_SERVICE";
        CapabilityBoundingSet = lib.optional (cfg.ssh.port < 1024) "CAP_NET_BIND_SERVICE";
        NoNewPrivileges = true;
        PrivateTmp = true;
        ProtectHome = true;
        ProtectSystem = "strict";
        ReadWritePaths = [ "/var/lib/amirsalarsafaei-com-ssh" ];
      };
    };
  };
}
