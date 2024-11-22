defmodule Jenot.Note do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "notes" do
    field(:internal_id, :string)
    field(:type, Ecto.Enum, values: [:note, :tasklist], default: :note)
    field(:title, :string, default: "")
    field(:content, :string)

    belongs_to(:account, Jenot.Account, type: :binary_id)

    timestamps(type: :utc_datetime)
  end

  def new(account, params) do
    %__MODULE__{}
    |> cast(params, [:internal_id, :type, :title, :content])
    |> put_change(:id, Ecto.UUID.generate())
    |> validate_required([:internal_id, :type])
    |> put_assoc(:account, account)
  end

  def update(note, params) do
    note
    |> cast(params, [:type, :title, :content])
  end
end
