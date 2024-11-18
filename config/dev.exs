import Config

config :plug_live_reload,
  patterns: [
    ~r"priv/static/.*(html|js|css|png|jpeg|jpg|gif|svg)$"
  ]

config :jenot, Jenot.Repo, database: "priv/db_dev.sqlite"
