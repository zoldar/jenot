defmodule Jenot.Repo do
  use Ecto.Repo, otp_app: :jenot, adapter: Ecto.Adapters.SQLite3
end
