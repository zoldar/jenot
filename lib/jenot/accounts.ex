defmodule Jenot.Accounts do
  alias Jenot.Account
  alias Jenot.Repo

  def get() do
    Repo.one(Account)
  end
end
