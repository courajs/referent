referent-host:
{config, pkgs, ...}:
let app = import ./web-frontend;
in {
  services.nginx = {
    enable = true;
    recommendedGzipSettings = true;
    recommendedOptimisation = true;
    recommendedProxySettings = true;
    recommendedTlsSettings = true;

    virtualHosts."${referent-host}" = {
      forceSSL = true;
      enableACME = true;
      locations = {
        "/" = {
          root = app;
          extraConfig = "error_page 404 /index.html;";
        };
        "= /sync" = {
          proxyWebsockets = true;
          proxyPass = "http://localhost:3030/";
        };
        "/sync/" = {
          proxyWebsockets = true;
          proxyPass = "http://localhost:3030/";
        };
      };
    };
  };
}
