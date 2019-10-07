{config, pkgs, ...}:
# let app = import ./server; in
{
  systemd.services.referent-sync-server = {
    description = "Data sync server for Referent";
    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" ];
    environment = {
      PORT = "3030";
    };
    serviceConfig = {
      ExecStart = "${pkgs.nodejs-10_x}/bin/node /var/referent/server/server.js /var/referent.db";
    };
  };
}
