defmodule Jenot.MixProject do
  use Mix.Project

  def project do
    [
      app: :jenot,
      version: "0.1.0",
      elixir: "~> 1.17",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps(),
      releases: releases()
    ]
  end

  def application do
    [
      extra_applications: [:logger],
      mod: {Jenot.Application, []}
    ]
  end

  defp elixirc_paths(env) when env in [:test, :dev],
    do: ["lib", "test/support"]

  defp elixirc_paths(_), do: ["lib"]

  def releases do
    [
      jenot: [
        steps: [:assemble, &Burrito.wrap/1],
        burrito: [
          targets: [
            macos: [os: :darwin, cpu: :x86_64],
            linux: [os: :linux, cpu: :x86_64]
          ]
        ]
      ]
    ]
  end

  defp deps do
    [
      {:burrito, "~> 1.0"},
      {:bandit, "~> 1.0"},
      {:bcrypt_elixir, "~> 3.0"},
      {:hahash, "~> 0.2.0"},
      {:web_push_elixir, "~> 0.4.0"},
      {:ecto, "~> 3.10"},
      {:ecto_sql, "~> 3.0"},
      {:postgrex, ">= 0.0.0"},
      {:plug_live_reload, "~> 0.1.0", only: :dev}
    ]
  end

  defp aliases do
    [
      setup: ["deps.get", "ecto.create", "ecto.migrate"],
      "ecto.reset": ["ecto.drop", "ecto.create", "ecto.migrate"],
      test: ["ecto.create --quiet", "ecto.migrate", "test"]
    ]
  end
end
