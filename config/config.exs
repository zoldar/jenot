import Config

config :jenot,
  ecto_repos: [Jenot.Repo]

import_config "#{config_env()}.exs"
