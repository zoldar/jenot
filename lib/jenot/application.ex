defmodule Jenot.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    Jenot.Release.migrate()

    children = [
      Jenot.Repo,
      {Bandit, plug: Jenot.Web, scheme: :http, port: Application.fetch_env!(:jenot, :port)}
    ]

    opts = [strategy: :one_for_one, name: Jenot.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
