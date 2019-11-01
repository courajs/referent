hosts:
{config, pkgs, ...}:
builtins.foldl' (x: y: x // y) {} (map
({name, password}:
let
  serviceName = "referent-server-${name}";
  pw          = "referent-password-${name}";
  pwService   = "${pw}-key.service";
  dbFile      = "/var/referent/${name}/referent.db";
  serverPath  = "/var/referent/${name}/app/server/server.js";
  socketPath  = "/run/referent-${name}.socket";
  app         = import ./web-frontend;
in {
  deployment.keys.${pw}.text = password;

  systemd.services.${serviceName} = {
    description = "Referent data sync server (${name})";
    after = [ "network.target" pwService];
    wants = [ pwService ];
    serviceConfig = {
      ExecStart = "${pkgs.nodejs-10_x}/bin/node ${serverPath} ${dbFile}";
    };
  };

  systemd.sockets.${serviceName}.listenStreams = [ socketPath ];

  services.nginx.virtualHosts.${name} = {
    forceSSL = true;
    enableACME = true;
    locations = {
      "/" = {
        root = app;
        extraConfig = "error_page 404 /index.html";
      };
      "= /sync" = {
        proxyWebsockets = true;
        proxyPass = "http://unix:${socketPath}:/";
      };
      "/sync/" = {
        proxyWebsockets = true;
        proxyPass = "http://unix:${socketPath}:/";
      };
    };
  };
})
hosts) // {
  services.nginx = {
    enable = true;
    recommendedGzipSettings = true;
    recommendedOptimisation = true;
    recommendedProxySettings = true;
    recommendedTlsSettings = true;
  };
}
