defmodule Jenot.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      Jenot.Repo,
      {Bandit, plug: Jenot.Web, scheme: :http, port: 4000}
    ]

    opts = [strategy: :one_for_one, name: Jenot.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
