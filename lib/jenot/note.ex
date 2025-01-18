defmodule Jenot.Note do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "notes" do
    field(:internal_id, :string)
    field(:type, Ecto.Enum, values: [:note, :tasklist], default: :note)
    field(:title, :string, default: "")
    field(:content, :string)
    field(:deleted_at, :utc_datetime_usec)

    belongs_to(:account, Jenot.Account, type: :binary_id)
    has_one(:reminder, Jenot.Reminder)

    field(:server_updated_at, :utc_datetime_usec)
    timestamps(type: :utc_datetime_usec)
  end

  def new(account, params) do
    %__MODULE__{}
    |> cast(params, [
      :internal_id,
      :type,
      :title,
      :content,
      :deleted_at,
      :inserted_at,
      :updated_at
    ])
    |> put_change(:id, Ecto.UUID.generate())
    |> put_change(:server_updated_at, DateTime.utc_now())
    |> validate_required([:internal_id, :type, :inserted_at, :updated_at])
    |> put_assoc(:account, account)
  end

  def update(note, params) do
    note
    |> cast(params, [:type, :title, :content, :deleted_at, :updated_at])
    |> validate_required([:internal_id, :type, :updated_at])
  end
end
