import Config

config :jenot, host: System.fetch_env!("WEB_HOST")

port = if config_env() == :test, do: 4001, else: 4000

config :jenot, port: port

config :jenot, secret_key_base: System.fetch_env!("SECRET_KEY_BASE")

config :jenot, secure_cookie: System.fetch_env!("SECURE_COOKIE") == "true"

config :web_push_elixir,
  vapid_public_key: System.fetch_env!("VAPID_PUBLIC_KEY"),
  vapid_private_key: System.fetch_env!("VAPID_PRIVATE_KEY"),
  vapid_subject: System.fetch_env!("VAPID_SUBJECT")

config :jenot, Jenot.Repo, url: System.get_env("DATABASE_URL")
