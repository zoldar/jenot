defmodule Jenot.Reminder do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key false
  schema "reminders" do
    field(:date, :date)
    field(:time, :time)
    field(:repeat, :integer)
    field(:unit, Ecto.Enum, values: [:day, :week, :month, :year])
    field(:enabled, :boolean)

    belongs_to(:note, Jenot.Note, type: :binary_id)

    timestamps(type: :utc_datetime_usec)
  end

  def update(_note, nil), do: nil

  def update(note, params) do
    %__MODULE__{}
    |> cast(params, [
      :date,
      :time,
      :repeat,
      :unit,
      :enabled,
      :inserted_at,
      :updated_at
    ])
    |> validate_required([:date, :time, :enabled, :inserted_at, :updated_at])
    |> put_assoc(:note, note)
  end
end
