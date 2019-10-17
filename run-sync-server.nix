password:
{config, pkgs, ...}:
# let app = import ./server; in
{
  deployment.keys.referent-password.text = password;

  systemd.services.referent-sync-server = {
    description = "Data sync server for Referent";
    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" "referent-password-key.service" ];
    wants = [ "referent-password-key.service" ];
    environment = {
      PORT = "3030";
    };
    serviceConfig = {
      ExecStart = "${pkgs.nodejs-10_x}/bin/node /var/referent/server/server.js /var/referent.db";
    };
  };
}
