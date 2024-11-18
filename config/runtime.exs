import Config

config :web_push_elixir,
  vapid_public_key: System.fetch_env!("VAPID_PUBLIC_KEY"),
  vapid_private_key: System.fetch_env!("VAPID_PRIVATE_KEY"),
  vapid_subject: System.fetch_env!("VAPID_SUBJECT")

config :jenot, Jenot.Repo, key: System.fetch_env!("EXQLITE_SECRET")

if config_env() == :prod do
  config :jenot, Jenot.Repo, database: System.get_env("EXQLITE_PATH")
end
