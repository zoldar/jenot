defmodule Jenot.MixProject do
  use Mix.Project

  def project do
    [
      app: :jenot,
      version: "0.1.0",
      elixir: "~> 1.17",
      start_permanent: Mix.env() == :prod,
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
      {:ecto_sqlite3, "~> 0.17"},
      {:plug_live_reload, "~> 0.1.0", only: :dev}
    ]
  end
end
