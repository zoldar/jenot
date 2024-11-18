defmodule Jenot.MixProject do
  use Mix.Project

  def project do
    [
      app: :jenot,
      version: "0.1.0",
      elixir: "~> 1.17",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  # Run "mix help compile.app" to learn about applications.
  def application do
    [
      extra_applications: [:logger],
      mod: {Jenot.Application, []}
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:bandit, "~> 1.0"},
      {:web_push_elixir, "~> 0.4.0"},
      {:ecto_sqlite3, "~> 0.17"},
      {:plug_live_reload, "~> 0.1.0", only: :dev}
    ]
  end
end
