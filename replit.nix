{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.postgresql
    pkgs.redis
    pkgs.python3
  ];
  env = {
    NODEJS_VERSION = "20";
    POSTGRESQL_VERSION = "14";
  };
}