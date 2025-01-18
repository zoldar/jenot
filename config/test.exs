import Config

config :jenot, Jenot.Repo,
  database: "priv/db_test.sqlite",
  pool: Ecto.Adapters.SQL.Sandbox

config :logger, :default_handler, level: :warning

config :bcrypt_elixir, :log_rounds, 4
