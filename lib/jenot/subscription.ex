defmodule Jenot.Subscription do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "subscriptions" do
    field(:endpoint, :string)
    field(:token, :string)
    field(:auth, :string)

    field(:hash, :string)

    belongs_to(:account, Jenot.Account)

    timestamps(type: :utc_datetime_usec)
  end
end
