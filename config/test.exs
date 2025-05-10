import Config

config :jenot, Jenot.Repo,
  url: "postgres://postgres:postgres@localhost/jenot_test",
  pool: Ecto.Adapters.SQL.Sandbox

config :logger, :default_handler, level: :warning

config :bcrypt_elixir, :log_rounds, 4
