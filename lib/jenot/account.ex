defmodule Jenot.Account do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "accounts" do
    timestamps(type: :utc_datetime_usec)
  end

  def new() do
    %__MODULE__{}
    |> change()
    |> put_change(:id, Ecto.UUID.generate())
  end
end
