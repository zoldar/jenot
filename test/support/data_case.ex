defmodule Jenot.DataCase do
  use ExUnit.CaseTemplate

  using do
    quote do
      alias Jenot.Repo

      import Ecto
      import Ecto.Query
      import Jenot.DataCase
    end
  end

  setup tags do
    if tags[:async] do
      raise "SQLite3 does not support async testing in sandbox mode"
    end

    pid = Ecto.Adapters.SQL.Sandbox.start_owner!(Jenot.Repo, shared: true)
    on_exit(fn -> Ecto.Adapters.SQL.Sandbox.stop_owner(pid) end)
    :ok
  end
end
